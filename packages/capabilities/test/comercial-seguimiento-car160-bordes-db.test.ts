import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import type { EventoPublicado } from "../src/eventos/consumidores";
import { consumidorTareaDePaso } from "../src/comercial/seguimiento-pausas";
import { trabajoVencerPasosSeguimiento } from "../src/comercial/seguimiento-trabajo";
import { dato } from "./maestros-ayuda";
import { empresaCar160 } from "./seguimiento-car160-ayuda";

type Envio = { movido: boolean; etapaId: string | null; seguimiento: { id: string } | null };

// CAR-160, bordes de la autorrevisión: «mover sin seguimiento» nunca baja la etapa; la tarea de un paso
// cancelada a mano omite el paso; completada con el seguimiento en pausa, lo deja hecho.
describe("comercial · seguimiento CAR-160, bordes (Postgres real)", () => {
  let e: Entorno;
  let A: Awaited<ReturnType<typeof empresaCar160>>;
  const etapaDe = async (id: string) => (await e.admin.negocio.findUniqueOrThrow({ where: { id } })).etapaId;
  async function conTareas(negocioId: string) {
    const s = (await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId, opcion: "iniciar" })).seguimiento!;
    await e.admin.seguimientoPaso.updateMany({ where: { seguimientoId: s.id }, data: { programadoEn: new Date(Date.now() - 60_000) } });
    await trabajoVencerPasosSeguimiento.ejecutar(A.c, { hora: "x" });
    return { s, pasos: await e.admin.seguimientoPaso.findMany({ where: { seguimientoId: s.id }, orderBy: { orden: "asc" } }) };
  }
  async function consumir(tipo: string, actividadId: string) {
    const evs: EventoPublicado[] = await e.admin.evento.findMany({ where: { tenantId: A.tenantId, tipo, entidadId: actividadId } });
    for (const ev of evs) await consumidorTareaDePaso.handler(A.c, ev);
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    A = await empresaCar160(e, "Gama 160");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("mover sin seguimiento a una etapa anterior no baja el negocio, pero cancela el seguimiento", async () => {
    const n = await A.negocio();
    await dato(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "iniciar" });
    const r = await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "mover_sin_seguimiento", etapaId: A.etapa("Calificado").id });
    expect(r).toMatchObject({ movido: false, etapaId: A.etapa("Propuesta enviada").id });
    expect(await etapaDe(n)).toBe(A.etapa("Propuesta enviada").id);
    expect(await e.admin.seguimiento.count({ where: { negocioId: n, estado: { in: ["activo", "pausado"] } } })).toBe(0);
  });

  it("la tarea cancelada a mano omite el paso; completada con el seguimiento pausado, lo deja hecho", async () => {
    const n = await A.negocio();
    const { s, pasos } = await conTareas(n);
    const [p1, p2] = pasos;
    await dato(A.c, "core.actividades.update", { id: p1!.actividadId!, estado: "cancelada" });
    await consumir("core.actividad.actualizada", p1!.actividadId!);
    expect(await e.admin.seguimientoPaso.findUniqueOrThrow({ where: { id: p1!.id } })).toMatchObject({ estado: "omitido", resultado: "Tarea cancelada." });
    await dato(A.c, "comercial.seguimientos.controlar", { id: s.id, accion: "pausar", motivo: "Vacaciones del cliente" });
    await dato(A.c, "core.actividades.completar", { id: p2!.actividadId! });
    await consumir("core.actividad.tarea_completada", p2!.actividadId!);
    await consumir("core.actividad.tarea_completada", p2!.actividadId!);
    expect((await e.admin.seguimientoPaso.findUniqueOrThrow({ where: { id: p2!.id } })).estado).toBe("hecho");
    expect(await e.admin.evento.count({ where: { tenantId: A.tenantId, tipo: "comercial.seguimiento.paso_registrado", payload: { path: ["pasoId"], equals: p2!.id } } })).toBe(1);
  });
});
