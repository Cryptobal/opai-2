// CAR-42: el rastro de seguridad va a la cadena `seguridad` de la auditoría global, append-only para
// opai_app, sin IP en claro (el llamador pasa el HMAC).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("rastro de seguridad (CAR-42)", () => {
  let e: Entorno;
  const userId = randomUUID();

  beforeAll(async () => {
    e = await prepararEntorno();
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("encadena el hecho en el ámbito seguridad con usuario, tipo, HMAC de la IP y agente", async () => {
    const { registrarEventoSeguridad } = await import("../src/eventos-seguridad");
    const ipHmac = "a".repeat(64);
    await registrarEventoSeguridad({
      tipo: "seguridad.login",
      userId,
      detalle: { resultado: "fallido", metodo: "password", motivo: "INVALID_EMAIL_OR_PASSWORD" },
      ipHmac,
      userAgent: "Mozilla/5.0",
    });
    const [fila] = await e.admin.auditoriaGlobal.findMany({
      where: { ambito: "seguridad", entityId: userId },
    });
    expect(fila).toMatchObject({
      capability: "seguridad.login",
      actorType: "self",
      actorId: userId,
      ipCifrada: ipHmac,
      userAgent: "Mozilla/5.0",
      payload: { resultado: "fallido", metodo: "password", motivo: "INVALID_EMAIL_OR_PASSWORD" },
    });
    expect(fila?.seq).toBeGreaterThan(0);
  });

  it("opai_app no corrige ni borra el rastro", async () => {
    const app = e.appSinTenant;
    await expect(
      app.auditoriaGlobal.updateMany({ where: { entityId: userId }, data: { userAgent: "x" } }),
    ).rejects.toThrow(/permission denied/i);
    await expect(app.auditoriaGlobal.deleteMany({ where: { entityId: userId } })).rejects.toThrow(
      /permission denied/i,
    );
  });
});
