// NÚCLEO-B: la cuenta del rate limit vive en `core.rate_limit_ventanas` y se consume con la función
// `SECURITY DEFINER` `core.rate_limit_consumir`. El upsert es atómico: 50 llamadas en paralelo con
// máximo 10 permiten exactamente 10. `opai_app` no toca la tabla directo (solo ejecuta las funciones).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

type Veredicto = { permitido: boolean; restantes: number; reinicio: Date };

describe.skipIf(!urlPropietario)("rate_limit_consumir (NÚCLEO-B)", () => {
  let e: Entorno;

  beforeAll(async () => {
    e = await prepararEntorno();
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  // opai_app ejecuta la función (GRANT EXECUTE); no toca la tabla.
  async function consumir(clave: string, maximo: number, ventanaS: number): Promise<Veredicto> {
    const filas = await e.appSinTenant.$queryRaw<Veredicto[]>`
      SELECT permitido, restantes, reinicio
        FROM "core"."rate_limit_consumir"(${clave}, ${maximo}::int, ${ventanaS}::int)`;
    const r = filas[0];
    if (!r) throw new Error("sin fila");
    return r;
  }

  it("50 llamadas en paralelo con máximo 10 permiten exactamente 10", async () => {
    const clave = `conc-${randomUUID()}`;
    const res = await Promise.all(Array.from({ length: 50 }, () => consumir(clave, 10, 60)));
    expect(res.filter((r) => r.permitido).length).toBe(10);
    // Las permitidas llevan las restantes de 9 a 0; las bloqueadas, 0.
    expect(Math.max(...res.map((r) => r.restantes))).toBe(9);
  });

  it("bloquea al superar el máximo y reinicia al vencer la ventana", async () => {
    const clave = `win-${randomUUID()}`;
    expect((await consumir(clave, 1, 60)).permitido).toBe(true);
    expect((await consumir(clave, 1, 60)).permitido).toBe(false);
    // Ventana de 0 s: la siguiente llamada la ve vencida y reinicia (vuelve a permitir).
    expect((await consumir(clave, 1, 0)).permitido).toBe(true);
  });

  it("opai_app no lee ni escribe la tabla directo", async () => {
    await expect(
      e.appSinTenant.$queryRaw`SELECT count(*) FROM "core"."rate_limit_ventanas"`,
    ).rejects.toThrow();
  });

  it("la purga borra las ventanas sin actividad dentro de la retención", async () => {
    const clave = `purge-${randomUUID()}`;
    await consumir(clave, 5, 60);
    const filas = await e.appSinTenant.$queryRaw<{ purgadas: number }[]>`
      SELECT "core"."rate_limit_purgar"(0::int) AS purgadas`;
    expect(Number(filas[0]?.purgadas ?? 0)).toBeGreaterThanOrEqual(1);
  });
});
