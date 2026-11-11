import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import forge from "node-forge";
import { describe, expect, it } from "vitest";

import {
  MSG_CERTIFICADO_NO_VIGENTE,
  MSG_CERTIFICADO_VENCIDO,
  MSG_LLAVE_NO_CORRESPONDE,
  MSG_SIN_LLAVE_PRIVADA,
  validarCertificadoPfx,
} from "./certificado-pfx";
import { abrirCertificadoPfx } from "./certificado-pfx-clave";

function pfxDePrueba(opts?: {
  subject?: string;
  clave?: string;
  startdate?: string;
  enddate?: string;
  days?: number;
  certfile?: string;
  inkey?: string;
  in?: string;
}): { base64: string; clave: string; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), "opai-pfx-"));
  const key = opts?.inkey ?? join(dir, "key.pem");
  const cert = opts?.in ?? join(dir, "cert.pem");
  const pfx = join(dir, "test.pfx");
  const clave = opts?.clave ?? "clave-demo-123";
  if (!opts?.inkey) {
    const dayArgs =
      opts?.startdate && opts?.enddate
        ? `-startdate ${opts.startdate} -enddate ${opts.enddate}`
        : `-days ${opts?.days ?? 30}`;
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${key}" -out "${cert}" -nodes ${dayArgs} -subj "${opts?.subject ?? "/CN=Empresa Demo/O=Demo/serialNumber=12345678-9/C=CL"}"`,
      { stdio: "ignore" },
    );
  }
  const certfileArg = opts?.certfile ? `-certfile "${opts.certfile}"` : "";
  execSync(
    `openssl pkcs12 -export -out "${pfx}" -inkey "${key}" -in "${cert}" ${certfileArg} -passout pass:${clave}`,
    { stdio: "ignore" },
  );
  return { base64: readFileSync(pfx).toString("base64"), clave, dir };
}

describe("validarCertificadoPfx", () => {
  it("acepta un .pfx con clave correcta y extrae metadatos", () => {
    const { base64, clave, dir } = pfxDePrueba();
    try {
      const r = validarCertificadoPfx(base64, clave);
      expect(r.meta.titular).toContain("Empresa Demo");
      expect(r.meta.rutTitular).toBe("12345678-9");
      expect(r.meta.venceEn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.base64).toBe(base64);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rechaza clave incorrecta con mensaje claro", () => {
    const { base64, clave, dir } = pfxDePrueba();
    try {
      expect(() => validarCertificadoPfx(base64, `${clave}-x`)).toThrow(
        /clave del certificado no coincide/i,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rechaza base64 inválido", () => {
    expect(() => validarCertificadoPfx("%%%", "x")).toThrow(/no es un certificado/i);
  });

  it("rechaza certificado vencido", () => {
    const { base64, clave, dir } = pfxDePrueba({ days: 30 });
    try {
      const vence = validarCertificadoPfx(base64, clave).meta.venceEn;
      const despues = new Date(`${vence}T23:59:59.999Z`);
      despues.setUTCDate(despues.getUTCDate() + 1);
      expect(() => validarCertificadoPfx(base64, clave, despues)).toThrow(MSG_CERTIFICADO_VENCIDO);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rechaza certificado aún no vigente", () => {
    const { base64, clave, dir } = pfxDePrueba({ days: 30 });
    try {
      expect(() => validarCertificadoPfx(base64, clave, new Date("2000-01-01T00:00:00Z"))).toThrow(
        MSG_CERTIFICADO_NO_VIGENTE,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rechaza .pfx sin llave privada", () => {
    const dir = mkdtempSync(join(tmpdir(), "opai-pfx-"));
    try {
      const cert = join(dir, "cert.pem");
      const pfx = join(dir, "solo-cert.pfx");
      const clave = "clave-solo-cert";
      execSync(
        `openssl req -x509 -newkey rsa:2048 -keyout "${join(dir, "key.pem")}" -out "${cert}" -days 30 -nodes -subj "/CN=Solo Cert/C=CL"`,
        { stdio: "ignore" },
      );
      execSync(
        `openssl pkcs12 -export -out "${pfx}" -in "${cert}" -nokeys -passout pass:${clave}`,
        { stdio: "ignore" },
      );
      const base64 = readFileSync(pfx).toString("base64");
      expect(() => validarCertificadoPfx(base64, clave)).toThrow(MSG_SIN_LLAVE_PRIVADA);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rechaza llave que no corresponde al certificado", () => {
    const keys = forge.pki.rsa.generateKeyPair(512);
    const keysOtra = forge.pki.rsa.generateKeyPair(512);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    const attrs = [{ name: "commonName", value: "Cert Forge" }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keysOtra.privateKey, [cert], "clave-forge", {
      generateLocalKeyId: true,
    });
    const der = forge.asn1.toDer(p12Asn1).getBytes();
    const base64 = Buffer.from(der, "binary").toString("base64");
    expect(() => validarCertificadoPfx(base64, "clave-forge")).toThrow(MSG_LLAVE_NO_CORRESPONDE);
  });

  it("elige la hoja de la cadena (no la CA) para titular y RUT", () => {
    const caKeys = forge.pki.rsa.generateKeyPair(2048);
    const leafKeys = forge.pki.rsa.generateKeyPair(2048);
    const ahora = new Date();
    const caCert = forge.pki.createCertificate();
    caCert.publicKey = caKeys.publicKey;
    caCert.serialNumber = "01";
    caCert.validity.notBefore = ahora;
    caCert.validity.notAfter = new Date(ahora);
    caCert.validity.notAfter.setFullYear(caCert.validity.notBefore.getFullYear() + 1);
    const caAttrs = [{ name: "commonName", value: "CA Intermedia Demo" }];
    caCert.setSubject(caAttrs);
    caCert.setIssuer(caAttrs);
    caCert.sign(caKeys.privateKey, forge.md.sha256.create());

    const leafCert = forge.pki.createCertificate();
    leafCert.publicKey = leafKeys.publicKey;
    leafCert.serialNumber = "02";
    leafCert.validity.notBefore = ahora;
    leafCert.validity.notAfter = new Date(ahora);
    leafCert.validity.notAfter.setUTCDate(leafCert.validity.notBefore.getUTCDate() + 30);
    const leafAttrs = [
      { name: "commonName", value: "Hoja Empresa" },
      { shortName: "serialNumber", type: "2.5.4.5", value: "11111111-1" },
    ];
    leafCert.setSubject(leafAttrs);
    leafCert.setIssuer(caAttrs);
    leafCert.sign(caKeys.privateKey, forge.md.sha256.create());

    const clave = "clave-cadena";
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(leafKeys.privateKey, [caCert, leafCert], clave);
    const der = forge.asn1.toDer(p12Asn1).getBytes();
    const base64 = Buffer.from(der, "binary").toString("base64");
    const r = validarCertificadoPfx(base64, clave);
    expect(r.meta.titular).toContain("Hoja Empresa");
    expect(r.meta.rutTitular).toBe("11111111-1");
    expect(r.meta.titular).not.toMatch(/CA Intermedia/i);
  });
});

describe("RUT del titular y clave recortada (CAR-240, como extractRut de OPAI 1.0)", () => {
  const conPfx = (opts: Parameters<typeof pfxDePrueba>[0], prueba: (p: ReturnType<typeof pfxDePrueba>) => void) => {
    const p = pfxDePrueba(opts);
    try {
      prueba(p);
    } finally {
      rmSync(p.dir, { recursive: true, force: true });
    }
  };

  it("serialNumber con puntos, prefijo y DV en minúscula: 12345678-K", () =>
    conPfx({ subject: "/CN=Persona Demo/serialNumber=RUT 12.345.678-k/C=CL" }, ({ base64, clave }) => {
      expect(validarCertificadoPfx(base64, clave).meta.rutTitular).toBe("12345678-K");
    }));

  it("sin RUT en el serialNumber, lo toma del CN; sin RUT en ninguno, null (nunca el texto crudo)", () => {
    conPfx({ subject: "/CN=Persona Demo 9.876.543-2/serialNumber=ABC/C=CL" }, ({ base64, clave }) => {
      expect(validarCertificadoPfx(base64, clave).meta.rutTitular).toBe("9876543-2");
    });
    conPfx({ subject: "/CN=Persona Demo/serialNumber=ABC-123/C=CL" }, ({ base64, clave }) => {
      expect(validarCertificadoPfx(base64, clave).meta.rutTitular).toBeNull();
    });
  });

  it("abre con la clave recortada y la devuelve recortada; la clave correcta sin espacios queda igual", () =>
    conPfx({ clave: "clave-demo-123" }, ({ base64, clave }) => {
      expect(abrirCertificadoPfx(base64, ` ${clave}\n`).clave).toBe(clave);
      expect(abrirCertificadoPfx(base64, clave).clave).toBe(clave);
      expect(() => abrirCertificadoPfx(base64, "otra")).toThrow("La clave del certificado no coincide con el archivo.");
    }));
});
