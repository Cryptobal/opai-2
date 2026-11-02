import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validarCertificadoPfx } from "./certificado-pfx";

function pfxDePrueba(): { base64: string; clave: string } {
  const dir = mkdtempSync(join(tmpdir(), "opai-pfx-"));
  try {
    const key = join(dir, "key.pem");
    const cert = join(dir, "cert.pem");
    const pfx = join(dir, "test.pfx");
    const clave = "clave-demo-123";
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${key}" -out "${cert}" -days 30 -nodes -subj "/CN=Empresa Demo/O=Demo/serialNumber=12345678-9/C=CL"`,
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

describe("validarCertificadoPfx", () => {
  it("acepta un .pfx con clave correcta y extrae metadatos", () => {
    const { base64, clave } = pfxDePrueba();
    const r = validarCertificadoPfx(base64, clave);
    expect(r.meta.titular).toContain("Empresa Demo");
    expect(r.meta.rutTitular).toBe("12345678-9");
    expect(r.meta.venceEn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.base64).toBe(base64);
  });

  it("rechaza clave incorrecta con mensaje claro", () => {
    const { base64, clave } = pfxDePrueba();
    expect(() => validarCertificadoPfx(base64, `${clave}-x`)).toThrow(
      /clave del certificado no coincide/i,
    );
  });

  it("rechaza base64 inválido", () => {
    expect(() => validarCertificadoPfx("%%%", "x")).toThrow(/no es un certificado/i);
  });
});
