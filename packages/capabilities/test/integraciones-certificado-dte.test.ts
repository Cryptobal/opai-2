import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

function pfxDePrueba(subject = "/CN=Tenant Demo/serialNumber=98765432-1/C=CL"): { base64: string; clave: string } {
  const dir = mkdtempSync(join(tmpdir(), "opai-cap-pfx-"));
  try {
    const key = join(dir, "key.pem");
    const cert = join(dir, "cert.pem");
    const pfx = join(dir, "test.pfx");
    const clave = "clave-cap-1234";
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${key}" -out "${cert}" -days 30 -nodes -subj "${subject}"`,
      { stdio: "ignore" },
    );
    execSync(
      `openssl pkcs12 -export -out "${pfx}" -inkey "${key}" -in "${cert}" -passout pass:${clave}`,
      { stdio: "ignore" },
    );
    return { base64: readFileSync(pfx).toString("base64"), clave };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

beforeAll(() => {
  process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
});
beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});
afterEach(() => {
  delete process.env["OPAI_SECRETS_KEY"];
});

describe("core.integraciones.guardar_certificado_dte (CAR-149)", () => {
  it("guarda certificado y clave cifrados, metadatos en config y sin filtrar secretos", async () => {
    const { base64, clave } = pfxDePrueba();
    const { ctx, eventos, tabla } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.integraciones.guardar_certificado_dte", {
      proveedor: "dte_emision",
      archivoBase64: base64,
      claveCertificado: clave,
    });
    expect(r).toMatchObject({ ok: true });
    const data = r.ok ? (r.data as { config: { certificadoMeta: { titular: string } } }) : null;
    expect(data?.config.certificadoMeta.titular).toContain("Tenant Demo");
    expect(JSON.stringify(eventos)).not.toContain(base64);
    expect(JSON.stringify(eventos)).not.toContain(clave);
    expect(JSON.stringify(tabla("secreto"))).not.toContain(base64);
    expect(JSON.stringify(tabla("secreto"))).not.toContain(clave);
    const lista = await executeCapability(ctx, "core.integraciones.get", {
      proveedor: "dte_emision",
    });
    expect(lista.ok ? JSON.stringify(lista.data) : "").not.toContain(base64);
    expect(lista.ok ? JSON.stringify(lista.data) : "").not.toContain(clave);
    expect(lista.ok ? JSON.stringify(lista.data) : "").toMatch(/certificadoMeta/);
    const secretos = lista.ok
      ? (lista.data as { secretos: { nombre: string; mascara: string | null }[] }).secretos
      : [];
    const mascaraClave = secretos.find((s) => s.nombre === "certificado_clave")?.mascara;
    expect(mascaraClave).toBe("••••••••");
    for (const ch of clave) {
      expect(mascaraClave).not.toContain(ch);
    }
  });

  it("dryRun valida clave sin persistir", async () => {
    const { base64, clave } = pfxDePrueba();
    const { ctx, tabla } = contextoDePrueba();
    const r = await executeCapability(
      ctx,
      "core.integraciones.guardar_certificado_dte",
      {
        proveedor: "dte_emision",
        archivoBase64: base64,
        claveCertificado: clave,
      },
      { dryRun: true },
    );
    expect(r).toMatchObject({ ok: true });
    expect(tabla("secreto")).toHaveLength(0);
  });

  it("rechaza clave incorrecta", async () => {
    const { base64, clave } = pfxDePrueba();
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.integraciones.guardar_certificado_dte", {
      proveedor: "dte_emision",
      archivoBase64: base64,
      claveCertificado: `${clave}-mal`,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(r.ok === false && r.error.message).toMatch(/clave del certificado/i);
  });

  it("acepta la clave con espacios o salto de línea al final, recortada (CAR-240)", async () => {
    const { base64, clave } = pfxDePrueba();
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.integraciones.guardar_certificado_dte", {
      proveedor: "dte_emision",
      archivoBase64: base64,
      claveCertificado: ` ${clave}\n`,
    }, { dryRun: true });
    expect(r.ok ? null : r.error).toBeNull();
  });

  it("rechaza un certificado sin RUT del titular, como extractRut de 1.0 (CAR-240)", async () => {
    const { base64, clave } = pfxDePrueba("/CN=Sin Rut/serialNumber=ABC-123/C=CL");
    const { ctx, tabla } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.integraciones.guardar_certificado_dte", {
      proveedor: "dte_emision",
      archivoBase64: base64,
      claveCertificado: clave,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(r.ok === false && r.error.message).toMatch(/RUT del titular/);
    expect(tabla("secreto")).toHaveLength(0);
  });
});
