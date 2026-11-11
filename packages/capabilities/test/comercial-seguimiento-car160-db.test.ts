import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { prepararEntorno, type Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { capacidadesComercial } from "../src/comercial";
import type { EventoPublicado } from "../src/eventos/consumidores";
import { consumidorRespuestaPorActividad, consumidorRespuestaPorEtapa, consumidorTareaDePaso } from "../src/comercial/seguimiento-pausas";
import { trabajoVencerPasosSeguimiento } from "../src/comercial/seguimiento-trabajo";
import { codigo, dato } from "./maestros-ayuda";

type Plan = { id: string; porDefecto: boolean; config: Record<string, unknown> & { pasos: Record<string, unknown>[] } };
type Envio = { pasosCancelados: number; etapaId: string | null; etapasAbiertas: { id: string; nombre: string }[]; seguimiento: { id: string } | null };

// CAR-160: brechas del PR 1 del seguimiento contra Postgres real, con dos empresas ficticias.
describe("comercial · seguimiento CAR-160 (Postgres real)", () => {
  let e: Entorno;
  const medidor = { registrar: async () => undefined };
  async function empresa(nombre: string) {
    const t = await e.admin.tenant.create({ data: { slug: `c160-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const u = await e.admin.user.create({ data: { name: `Vendedora ${nombre}`, email: `v-${randomUUID().slice(0, 8)}@prueba.cl`, emailVerified: true } });
    await e.admin.membership.create({ data: { tenantId: t.id, userId: u.id, rol: "owner", portales: ["erp"] } });
    const c = mod.crearContexto({
      tenantId: t.id, actor: { tipo: "user", id: u.id }, usuario: { id: u.id, nombre: "Vendedora", email: "v@prueba.cl", platformRole: null },
      rol: "owner", portal: "erp", portalesMembresia: ["erp"], modulosActivos: ["comercial"], medidor,
    });
    const cuenta = await dato<{ id: string }>(c, "core.cuentas.create", { nombre });
    const etapas = await e.admin.etapa.findMany({ where: { tenantId: t.id }, orderBy: { orden: "asc" } });
    const etapa = (n: string) => etapas.find((x) => x.nombre === n)!;
    // Negocio en «Propuesta enviada» con monto y cierre: puede avanzar sin requisitos pendientes.
    const negocio = async () => {
      const n = await dato<{ id: string }>(c, "comercial.negocios.create", { cuentaId: cuenta.id, titulo: `Negocio ${randomUUID().slice(0, 4)}` });
      await e.admin.negocio.update({ where: { id: n.id }, data: { etapaId: etapa("Propuesta enviada").id, montoEstimadoMensual: 1_000_000, cierreEstimado: new Date("2026-12-31T00:00:00Z"), responsableId: u.id } });
      return n.id;
    };
    return { tenantId: t.id, userId: u.id, c, etapa, negocio };
  }
  let A: Awaited<ReturnType<typeof empresa>>;
  let B: Awaited<ReturnType<typeof empresa>>;
  const etapaDe = async (id: string) => (await e.admin.negocio.findUniqueOrThrow({ where: { id } })).etapaId;
  const vencerTodo = (seguimientoId: string) => e.admin.seguimientoPaso.updateMany({ where: { seguimientoId, estado: "programado" }, data: { programadoEn: new Date(Date.now() - 60_000) } });
  async function configurar(cambios: Record<string, unknown>, pasos?: (p: Record<string, unknown>, i: number) => Record<string, unknown>) {
    const p = (await dato<Plan[]>(A.c, "comercial.seguimiento_planes.list", {})).find((x) => x.porDefecto)!;
    const config = { ...p.config, ...cambios, pasos: pasos ? p.config.pasos.map(pasos) : p.config.pasos };
    await dato(A.c, "comercial.seguimiento_planes.guardar", { id: p.id, nombre: "Post-cotización", disparador: "cotizacion_enviada", porDefecto: true, activo: true, config });
  }
  async function eventos(tipo: string, tenantId = A.tenantId): Promise<EventoPublicado[]> {
    return (await e.admin.evento.findMany({ where: { tenantId, tipo }, orderBy: { createdAt: "asc" } })) as unknown as EventoPublicado[];
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...capacidadesComercial]);
    A = await empresa("Alfa 160");
    B = await empresa("Beta 160");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("al enviar: mover sin seguimiento exige elegir etapa abierta, cancela los pasos pendientes y no agenda otro", async () => {
    const n = await A.negocio();
    await dato(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "iniciar" });
    const previa = await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "mover_sin_seguimiento" }, { dryRun: true });
    expect(previa.pasosCancelados).toBe(4);
    expect(previa.etapasAbiertas.map((x) => x.nombre)).toEqual(["Prospecto", "Calificado", "Visita técnica", "Propuesta enviada", "Negociación", "Firma de contrato"]);
    expect(await codigo(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "mover_sin_seguimiento" })).toBe("UNPROCESSABLE");
    expect(await codigo(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "mover_sin_seguimiento", etapaId: A.etapa("Adjudicado").id })).toBe("UNPROCESSABLE");
    const r = await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "mover_sin_seguimiento", etapaId: A.etapa("Negociación").id });
    expect(r).toMatchObject({ pasosCancelados: 4, etapaId: A.etapa("Negociación").id, seguimiento: null });
    expect(await etapaDe(n)).toBe(A.etapa("Negociación").id);
    expect(await e.admin.seguimiento.count({ where: { negocioId: n, estado: { in: ["activo", "pausado"] } } })).toBe(0);
    // «Solo enviar» no cambia nada.
    const solo = await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "solo_enviar" });
    expect(solo).toMatchObject({ pasosCancelados: 0, seguimiento: null, etapaId: A.etapa("Negociación").id });
  });

  it("el reenvío reemplaza: cancela los pasos y las tareas del anterior y agenda desde el nuevo envío", async () => {
    const n = await A.negocio();
    const s1 = (await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "iniciar" })).seguimiento!;
    await vencerTodo(s1.id);
    await trabajoVencerPasosSeguimiento.ejecutar(A.c, { hora: "x" });
    const tareas1 = (await e.admin.seguimientoPaso.findMany({ where: { seguimientoId: s1.id } })).map((p) => p.actividadId).filter(Boolean) as string[];
    expect(tareas1.length).toBeGreaterThan(0);
    const s2 = (await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "iniciar", cotizacionCodigo: "COT-2" })).seguimiento!;
    expect(s2.id).not.toBe(s1.id);
    expect(await e.admin.seguimiento.findUniqueOrThrow({ where: { id: s1.id } })).toMatchObject({ estado: "cancelado", motivo: "reemplazado" });
    expect(await e.admin.seguimientoPaso.count({ where: { seguimientoId: s1.id, estado: { not: "cancelado" } } })).toBe(0);
    expect(await e.admin.actividad.count({ where: { id: { in: tareas1 }, estado: "pendiente" } })).toBe(0);
    expect(await e.admin.seguimientoPaso.count({ where: { seguimientoId: s2.id, estado: "programado" } })).toBe(4);
  });

  it("el trabajo dos veces no duplica tareas; la tarea es del responsable, con el borrador y el aviso de asignación", async () => {
    const n = await A.negocio();
    const s = (await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "iniciar", cotizacionCodigo: "COT-9" })).seguimiento!;
    await vencerTodo(s.id);
    await trabajoVencerPasosSeguimiento.ejecutar(A.c, { hora: "x" });
    await trabajoVencerPasosSeguimiento.ejecutar(A.c, { hora: "y" });
    const pasos = await e.admin.seguimientoPaso.findMany({ where: { seguimientoId: s.id }, orderBy: { orden: "asc" } });
    expect(pasos.every((p) => p.estado === "por_hacer" && p.actividadId)).toBe(true);
    const tareas = await e.admin.actividadVinculo.findMany({ where: { negocioId: n }, include: { actividad: { include: { responsables: true } } } });
    const deTareas = tareas.filter((v) => v.actividad.tipo === "tarea");
    expect(deTareas).toHaveLength(4);
    expect(deTareas.every((v) => v.actividad.responsables.map((r) => r.usuarioId).join() === A.userId)).toBe(true);
    expect(pasos[0]).toMatchObject({ asunto: "Seguimiento de la cotización COT-9" });
    expect(pasos[0]?.cuerpo).toContain("COT-9");
    const primera = deTareas.find((v) => v.actividadId === pasos[0]?.actividadId)!;
    expect(primera.actividad.detalle).toContain("Asunto: Seguimiento de la cotización COT-9");
    const asignadas = (await eventos("core.actividad.tarea_asignada")).filter((ev) => pasos.some((p) => p.actividadId === ev.entidadId));
    expect(asignadas).toHaveLength(4);
    // Las ve como cualquier tarea suya (Mis tareas, Inicio y la Bandeja usan esta lectura).
    const mias = await dato<{ items: { id: string }[] }>(A.c, "core.actividades.tareas", { limite: 100 });
    expect(pasos.every((p) => mias.items.some((t) => t.id === p.actividadId))).toBe(true);
  });

  it("hacer el paso cierra su tarea y aplica la etapa destino solo hacia adelante; completar la tarea hace el paso", async () => {
    const negociacion = A.etapa("Negociación").id;
    await configurar({}, (p, i) => (i === 0 ? { ...p, etapaDestino: negociacion } : i === 1 ? { ...p, etapaDestino: A.etapa("Calificado").id } : p));
    const plan = (await dato<Plan[]>(A.c, "comercial.seguimiento_planes.list", {})).find((x) => x.porDefecto)!;
    const aPerdido = { ...plan.config, pasos: plan.config.pasos.map((p, i) => (i === 0 ? { ...p, etapaDestino: A.etapa("Perdido").id } : p)) };
    expect(await codigo(A.c, "comercial.seguimiento_planes.guardar", { id: plan.id, nombre: "Post-cotización", disparador: "cotizacion_enviada", porDefecto: true, activo: true, config: aPerdido })).toBe("UNPROCESSABLE");
    const n = await A.negocio();
    const s = (await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "iniciar" })).seguimiento!;
    await vencerTodo(s.id);
    await trabajoVencerPasosSeguimiento.ejecutar(A.c, { hora: "x" });
    const [p1, p2] = await e.admin.seguimientoPaso.findMany({ where: { seguimientoId: s.id }, orderBy: { orden: "asc" } });
    await dato(A.c, "comercial.seguimientos.registrar_paso", { pasoId: p1!.id, accion: "hecho", resultado: "Llamé" });
    expect((await e.admin.actividad.findUniqueOrThrow({ where: { id: p1!.actividadId! } })).estado).toBe("hecha");
    expect(await etapaDe(n)).toBe(negociacion);
    // Paso 2 apunta a una etapa anterior: no baja. Se hace desde la tarea (Mis tareas o la Bandeja).
    await dato(A.c, "core.actividades.completar", { id: p2!.actividadId! });
    const ev = (await eventos("core.actividad.tarea_completada")).find((x) => x.entidadId === p2!.actividadId)!;
    await consumidorTareaDePaso.handler(A.c, ev);
    await consumidorTareaDePaso.handler(A.c, ev);
    expect((await e.admin.seguimientoPaso.findUniqueOrThrow({ where: { id: p2!.id } })).estado).toBe("hecho");
    expect(await etapaDe(n)).toBe(negociacion);
    await configurar({}, (p) => ({ ...p, etapaDestino: undefined }));
  });

  it("una actividad marcada «el cliente respondió» y mover a negociación pausan; nunca bajan la etapa", async () => {
    await configurar({ etapaAlResponder: A.etapa("Negociación").id, alResponder: "pausar" });
    const n1 = await A.negocio();
    const s1 = (await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n1, opcion: "iniciar" })).seguimiento!;
    // Una nota sin la marca no cuenta (decisión 5); con la marca, sí.
    await dato(A.c, "core.actividades.create", { tipo: "nota", titulo: "Comentario interno", vinculos: [{ tipo: "negocio", id: n1 }] });
    await dato(A.c, "core.actividades.create", { tipo: "llamada", titulo: "Llamó el cliente", respuestaCliente: true, vinculos: [{ tipo: "negocio", id: n1 }] });
    expect(await codigo(A.c, "core.actividades.create", { tipo: "tarea", titulo: "X", respuestaCliente: true, vinculos: [{ tipo: "negocio", id: n1 }] })).toBe("UNPROCESSABLE");
    for (const ev of await eventos("core.actividad.registrada")) await consumidorRespuestaPorActividad.handler(A.c, ev);
    expect(await e.admin.seguimiento.findUniqueOrThrow({ where: { id: s1.id } })).toMatchObject({ estado: "pausado", motivo: "cliente_respondio" });
    expect(await etapaDe(n1)).toBe(A.etapa("Negociación").id);
    // Mover a mano a una etapa posterior a Negociación pausa y no baja.
    const n2 = await A.negocio();
    const s2 = (await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n2, opcion: "iniciar" })).seguimiento!;
    await dato(A.c, "comercial.negocios.mover", { id: n2, etapaId: A.etapa("Firma de contrato").id });
    for (const ev of (await eventos("comercial.negocio.etapa_cambiada")).filter((x) => x.entidadId === n2)) await consumidorRespuestaPorEtapa.handler(A.c, ev);
    expect((await e.admin.seguimiento.findUniqueOrThrow({ where: { id: s2.id } })).estado).toBe("pausado");
    expect(await etapaDe(n2)).toBe(A.etapa("Firma de contrato").id);
    // Mover a una etapa anterior a Negociación no pausa.
    const n3 = await A.negocio();
    const s3 = (await dato<Envio>(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n3, opcion: "iniciar" })).seguimiento!;
    await dato(A.c, "comercial.negocios.mover", { id: n3, etapaId: A.etapa("Calificado").id });
    for (const ev of (await eventos("comercial.negocio.etapa_cambiada")).filter((x) => x.entidadId === n3)) await consumidorRespuestaPorEtapa.handler(A.c, ev);
    expect((await e.admin.seguimiento.findUniqueOrThrow({ where: { id: s3.id } })).estado).toBe("activo");
  });

  it("el tablero muestra el indicador del seguimiento y no cruza de empresa", async () => {
    const n = await A.negocio();
    await dato(A.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "iniciar" });
    const tablero = await dato<{ negocios: { id: string; seguimiento: { texto: string } | null }[] }>(A.c, "comercial.negocios.embudo", {});
    expect(tablero.negocios.find((x) => x.id === n)?.seguimiento?.texto).toMatch(/^Seguimiento 1 de 4/);
    const deB = await dato<{ negocios: { id: string }[] }>(B.c, "comercial.negocios.embudo", {});
    expect(deB.negocios.some((x) => x.id === n)).toBe(false);
    expect(await codigo(B.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "mover_sin_seguimiento", etapaId: B.etapa("Negociación").id })).toBe("NOT_FOUND");
    expect(await codigo(B.c, "comercial.seguimientos.decidir_envio", { negocioId: n, opcion: "iniciar" })).toBe("NOT_FOUND");
    // B no ve tareas ni seguimientos de A, y su trabajo no toca los pasos de A.
    await trabajoVencerPasosSeguimiento.ejecutar(B.c, { hora: "x" });
    expect((await dato<{ items: unknown[] }>(B.c, "core.actividades.tareas", { equipo: true, limite: 100 })).items).toHaveLength(0);
  });
});
