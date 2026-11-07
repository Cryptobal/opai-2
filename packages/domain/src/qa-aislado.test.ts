import { describe, expect, it } from "vitest";

import { correoQa, planUsuariosQa, exigirDestinoQa, exigirSoloEmpresasQa, exigirTenantQaAislado, problemasDestinoQa } from "./qa-aislado";

const ok = {
  OPAI_ENTORNO: "qa-aislado",
  OPAI_QA_DESTINO: "opai2-qa-aislado",
  DATABASE_URL: "postgresql://opai_app:x@ep-abc-pooler.sa-east-1.aws.neon.tech/opai2_qa",
  DATABASE_URL_MIGRATE: "postgresql://opai2_qa_owner:y@ep-abc.sa-east-1.aws.neon.tech/opai2_qa",
  SII_ADAPTADOR: "simulado",
  CESION_ADAPTADOR: "simulado",
};

describe("QA aislado · guarda del destino (CAR-221)", () => {
  it("acepta exactamente el QA aislado: misma base (con o sin pool), rol de aplicación real, salidas simuladas", () => {
    expect(problemasDestinoQa(ok)).toEqual([]);
    expect(() => exigirDestinoQa(ok)).not.toThrow();
  });
  it("rechaza otra base, otro entorno o falta de la confirmación del destino", () => {
    expect(problemasDestinoQa({ ...ok, OPAI_ENTORNO: "dev" })).toHaveLength(1);
    expect(problemasDestinoQa({ ...ok, OPAI_QA_DESTINO: undefined })[0]).toMatch(/OPAI_QA_DESTINO/);
    const otra = { ...ok, DATABASE_URL: "postgresql://opai_app:x@ep-abc.sa-east-1.aws.neon.tech/neondb", DATABASE_URL_MIGRATE: "postgresql://o:y@ep-abc.sa-east-1.aws.neon.tech/neondb" };
    expect(problemasDestinoQa(otra).join(" ")).toMatch(/opai2_qa/);
  });
  it("rechaza dos endpoints distintos, el propietario como rol de aplicación y producción", () => {
    expect(problemasDestinoQa({ ...ok, DATABASE_URL_MIGRATE: "postgresql://o:y@ep-otro.sa-east-1.aws.neon.tech/opai2_qa" }).join(" ")).toMatch(/misma base/);
    expect(problemasDestinoQa({ ...ok, DATABASE_URL: "postgresql://opai2_qa_owner:x@ep-abc.sa-east-1.aws.neon.tech/opai2_qa" }).join(" ")).toMatch(/opai_app/);
    expect(problemasDestinoQa({ ...ok, NODE_ENV: "production" }).join(" ")).toMatch(/producción/);
  });
  it("exige SII y factoring simulados y correo sin llave", () => {
    expect(problemasDestinoQa({ ...ok, SII_ADAPTADOR: "simpleapi" }).join(" ")).toMatch(/SII_ADAPTADOR/);
    expect(problemasDestinoQa({ ...ok, CESION_ADAPTADOR: undefined }).join(" ")).toMatch(/CESION_ADAPTADOR/);
    expect(problemasDestinoQa({ ...ok, RESEND_API_KEY: "re_secreta" }).join(" ")).toMatch(/RESEND_API_KEY/);
  });
  it("nunca repite una URL ni un secreto en los mensajes", () => {
    const mensaje = problemasDestinoQa({ ...ok, DATABASE_URL: "postgresql://opai_app:ClaveSecreta@h/otra", RESEND_API_KEY: "re_secreta" }).join(" ");
    expect(mensaje).not.toMatch(/ClaveSecreta|re_secreta|postgresql:/);
    expect(problemasDestinoQa({ ...ok, DATABASE_URL: "no es url" }).join(" ")).toMatch(/Falta DATABASE_URL/);
  });
  it("solo empresas qa-*: una empresa real (gard) aborta; y solo las dos empresas del QA aislado", () => {
    expect(() => exigirSoloEmpresasQa(["qa-finanzas-a", "qa-finanzas-b"])).not.toThrow();
    expect(() => exigirSoloEmpresasQa(["qa-finanzas-a", "gard"])).toThrow(/no es el QA aislado vacío/);
    expect(() => exigirTenantQaAislado("qa-finanzas-a")).not.toThrow();
    expect(() => exigirTenantQaAislado("qa-otra")).toThrow(/no es una empresa del QA aislado/);
    expect(() => exigirTenantQaAislado("gard")).toThrow();
  });
  it("correos de QA con dominio .test", () => {
    expect(correoQa("qa-finanzas-a", "viewer")).toBe("viewer.qa-finanzas-a@qa.opai.test");
  });
  it("plan de usuarios: 5 roles en cada una de las dos empresas, sin correos repetidos", () => {
    const plan = planUsuariosQa();
    expect(plan).toHaveLength(10);
    expect(new Set(plan.map((u) => u.correo)).size).toBe(10);
    expect(plan.filter((u) => u.slug === "qa-finanzas-b").map((u) => u.rol)).toEqual(["owner", "admin", "gerente", "supervisor", "viewer"]);
    expect(plan.every((u) => u.correo.endsWith("@qa.opai.test"))).toBe(true);
  });
});
