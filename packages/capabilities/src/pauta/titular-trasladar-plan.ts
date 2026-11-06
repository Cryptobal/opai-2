import type { z } from "zod";

import type { TenantTx } from "@opai/db";
import { sumarDias } from "@opai/domain";

import { dondeInstalacion, dondePersona } from "../core/maestros/alcance";
import { crearVinculo } from "../core/maestros/vinculos-crear";
import { exigirEdicionVinculo } from "../core/maestros/vinculos-validacion";
import { vistaVinculo } from "../core/maestros/vinculos-vista";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { aFechaDb, fechaIso, hoy, puestoParaPauta } from "./comun";
import { nombresDePersonas } from "./nombres";
import { fijarSerieInterna } from "./series-nucleo";
import { sincronizarTitular } from "./titular-sincronizar";
import { primerosDias } from "./titular-vista";
import type { entradaTraslado, salidaTraslado } from "./titular-trasladar";

type Entrada = z.output<typeof entradaTraslado>;
type Salida = z.output<typeof salidaTraslado>;
const sync = (tx: TenantTx, c: Contexto, r: { puestoId: string; instalacionId: string; titularId: string | null }) => sincronizarTitular(tx, c, r);

/** Valida el traslado y arma la vista previa; con `tx` (ya con los locks tomados) además lo escribe. */
export async function planificarTraslado(ctx: Contexto, i: Entrada, tx: TenantTx | null): Promise<Salida> {
  const persona = await ctx.db.persona.findFirst({ where: { id: i.personaId, AND: [dondePersona(ctx)], estado: "activa", archivadaEn: null }, select: { id: true } });
  if (!persona) throw noEncontrado("La persona");
  const v0 = await ctx.db.vinculoLaboral.findFirst({ where: { personaId: i.personaId, estado: "vigente" } });
  if (!v0?.instalacionId) throw reglaDeNegocio("La persona no tiene un vínculo vigente con una instalación.");
  const destino = await puestoParaPauta(ctx, i.puestoDestinoId);
  if (!destino.patronId) throw reglaDeNegocio("El puesto de destino no tiene patrón de turno: elígelo en su ficha antes de trasladar.");
  const misma = v0.instalacionId === destino.instalacionId;
  const hoyCivil = await hoy(ctx);
  if (i.desde < hoyCivil) throw reglaDeNegocio("El traslado no puede regir antes de hoy: no se modifican los días pasados.");
  if (!misma) {
    exigirEdicionVinculo(ctx);
    // El vínculo cambia al dar la orden: con otra fecha el guardia quedaría sin vínculo en su instalación hasta entonces.
    if (i.desde !== hoyCivil) throw reglaDeNegocio("El traslado a otra instalación rige desde hoy: el vínculo cambia al confirmarlo.");
    if (!v0.horasSemanales || !v0.distribucion) throw reglaDeNegocio("El vínculo actual no tiene jornada pactada: complétala antes de trasladar.");
    const i2 = await ctx.db.instalacion.findFirst({ where: { id: destino.instalacionId, AND: [dondeInstalacion(ctx)], archivadaEn: null }, select: { id: true } });
    if (!i2) throw noEncontrado("La instalación de destino");
  }
  const series = await ctx.db.seriePauta.findMany({ where: { titularPersonaId: i.personaId, OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFechaDb(i.desde) } }] } });
  if (series.some((s) => s.puestoId === destino.id)) throw reglaDeNegocio("Esa persona ya es titular de ese puesto.");
  if (series.some((s) => fechaIso(s.vigenteDesde) > i.desde)) throw reglaDeNegocio("La persona tiene una asignación futura en otro puesto: quítala antes de trasladarla.");
  const termino = sumarDias(i.desde, -1);
  if (!misma && aFechaDb(termino) < v0.inicio) throw reglaDeNegocio("El vínculo actual empieza después del día anterior al traslado.");
  const origenes = new Map((await ctx.db.puesto.findMany({ where: { id: { in: series.map((s) => s.puestoId) }, estado: "activo" }, select: { id: true, nombre: true } })).map((p) => [p.id, p.nombre]));
  const cerrar = series.filter((s) => origenes.has(s.puestoId));
  const patron = await ctx.db.patronTurno.findUniqueOrThrow({ where: { id: destino.patronId } });
  const vigenteDestino = await ctx.db.seriePauta.findFirst({ where: { puestoId: destino.id, vigenteDesde: { lte: aFechaDb(i.desde) } }, orderBy: { vigenteDesde: "desc" } });
  const nombres = await nombresDePersonas(ctx, [vigenteDestino?.titularPersonaId ?? null]);
  const desplazado = vigenteDestino?.titularPersonaId ? { id: vigenteDestino.titularPersonaId, nombre: nombres.get(vigenteDestino.titularPersonaId) ?? "Titular del destino" } : null;
  const cierre = (c: Contexto, s: (typeof cerrar)[number], dry: boolean) =>
    fijarSerieInterna(c, { puestoId: s.puestoId, patronId: s.patronId, inicioCiclo: fechaIso(s.inicioCiclo), titularPersonaId: null, desde: i.desde }, { dryRun: dry, quitar: true, detalle: { via: "traslado" }, enTransaccion: sync });
  const nueva = (c: Contexto, dry: boolean) =>
    fijarSerieInterna(c, { puestoId: destino.id, patronId: destino.patronId!, inicioCiclo: i.inicioCiclo, titularPersonaId: i.personaId, desde: i.desde }, {
      dryRun: dry, detalle: { via: "traslado" }, simular: { cierres: Object.fromEntries(series.map((s) => [s.puestoId, termino])), sinVinculo: !misma }, enTransaccion: sync,
    });
  const salida = (serie: Salida["serie"]): Salida => ({
    personaId: i.personaId, mismaInstalacion: misma,
    puestosOrigen: cerrar.map((s) => ({ puestoId: s.puestoId, puesto: origenes.get(s.puestoId) ?? "", serieHasta: termino })),
    vinculoTerminado: misma ? null : { id: v0.id, termino }, vinculoNuevo: !misma, titularDesplazado: desplazado, serie,
    primerosDias: primerosDias(patron, i.inicioCiclo, i.desde),
  });
  if (!tx) {
    for (const s of cerrar) await cierre(ctx, s, true);
    return salida((await nueva(ctx, true)).serie);
  }
  // Primero el vínculo anterior (así el cierre de las series no toca su puesto) y luego las series.
  if (!misma) {
    await tx.vinculoLaboral.update({ where: { id: v0.id }, data: { termino: aFechaDb(termino), motivoTermino: i.motivo, estado: "terminado" } });
    await ctx.eventos.emitir(tx, { tipo: "core.vinculo.terminado", entidadTipo: "vinculo", entidadId: v0.id, payload: { personaId: i.personaId, termino } });
  }
  for (const s of cerrar) await cierre(ctx, s, false);
  if (!misma) {
    const creado = await crearVinculo(ctx, tx, i.personaId, {
      cargoId: v0.cargoId, instalacionId: destino.instalacionId, puestoId: destino.id, horasSemanales: v0.horasSemanales!, distribucion: v0.distribucion!,
      tipo: v0.tipo as "indefinido" | "plazo_fijo" | "por_obra" | "honorarios", inicio: i.desde, ...(v0.termino ? { termino: fechaIso(v0.termino) } : {}),
    });
    // El cambio de instalación sí cambia las condiciones: borrador de anexo para RR. HH. (consumidor de anexos).
    await ctx.eventos.emitir(tx, { tipo: "core.vinculo.actualizado", entidadTipo: "vinculo", entidadId: creado.id, payload: { personaId: i.personaId, antes: vistaVinculo(v0), despues: vistaVinculo(creado), campos: ["instalacionId"] } });
  }
  return salida((await nueva(ctx, false)).serie);
}
