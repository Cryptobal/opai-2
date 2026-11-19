import { describe, expect, it } from "vitest";

import {
  exigirPreviewCoherente,
  exigirRespaldoAntesDeProtegida,
  hayRespaldoReciente,
  hostDeUrl,
  resolverRamaNeonPorHost,
  urlConLockTimeoutSesion,
} from "../scripts/migrate-deploy-guardas";

describe("migrate deploy · guardas CI", () => {
  it("añade lock_timeout de sesión a la URL", () => {
    const base = "postgresql://u:p@ep-abc-pooler.neon.tech/neondb";
    const out = urlConLockTimeoutSesion(base);
    expect(out).toContain("lock_timeout");
    expect(urlConLockTimeoutSesion(out)).toBe(out);
  });

  it("normaliza host con y sin pooler", () => {
    expect(hostDeUrl("postgresql://u@ep-foo-pooler.sa-east-1.aws.neon.tech/db")).toBe(
      "ep-foo.sa-east-1.aws.neon.tech",
    );
  });

  it("exige PREVIEW_RAMA coherente con la rama Neon", () => {
    expect(() => exigirPreviewCoherente("preview/pr-9", "preview/pr-9")).not.toThrow();
    expect(() => exigirPreviewCoherente("preview/pr-9", "main")).toThrow(/no a «/);
  });

  it("resuelve rama por host de endpoint", () => {
    const hosts = [
      { name: "preview/pr-1", host: "ep-a.sa-east-1.aws.neon.tech" },
      { name: "main", host: "ep-b.sa-east-1.aws.neon.tech" },
    ];
    expect(resolverRamaNeonPorHost("ep-a.sa-east-1.aws.neon.tech", hosts)).toBe("preview/pr-1");
  });

  it("bloquea main sin respaldo reciente", () => {
    const viejo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const ramas = [{ name: "respaldo-viejo", created_at: viejo }];
    expect(hayRespaldoReciente(ramas, 48 * 60 * 60 * 1000)).toBe(false);
    expect(() => exigirRespaldoAntesDeProtegida(ramas, "main")).toThrow(/respaldo/);
  });
});