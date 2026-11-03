// Reporte de la simulación: solo conteos, motivos, nombres de campos e IDs (de 1.0 y de 2.0). Nunca
// nombres, RUT, correos ni teléfonos (Ley 21.719): `datos` del plan no se copia.
import type { Pendiente } from "./comercial-pendiente";
import type { CorrelativoCpqPropuesto } from "./correlativos-cpq";
import type { Accion, Decision, Propuesta } from "./comun";
import type { EntidadImportada } from "./destino-tipos";
import type { EtiquetaPropuesta, Plan } from "./plan";
import type { ResumenDestinatarios } from "./recurrentes";
import type { ResumenTributario } from "./tributario-plan";

const ACCIONES: Accion[] = ["crear", "actualizar", "sin_cambios", "conflicto", "omitido"];

export type GrupoDetalle = {
  entidad: EntidadImportada;
  accion: Accion;
  motivo: string;
  campos: string[];
  idsOpai1: string[];
};

export type Reporte = {
  modo: "simulacion";
  sistema: "opai1";
  tenant: string;
  modulosActivos: readonly string[];
  conteos: Record<EntidadImportada, Record<Accion, number>>;
  detalle: GrupoDetalle[];
  propuestasFusion: Propuesta[];
  avisos: { codigo: string; idsOpai1: string[] }[];
  etiquetas: EtiquetaPropuesta[];
  pendientes: Pendiente[];
  tributario: ResumenTributario;
  destinatarios: ResumenDestinatarios;
  correlativosCpq: CorrelativoCpqPropuesto[];
};

function conteo(decisiones: readonly Decision<unknown>[]): Record<Accion, number> {
  const c: Record<Accion, number> = {
    crear: 0,
    actualizar: 0,
    sin_cambios: 0,
    conflicto: 0,
    omitido: 0,
  };
  for (const d of decisiones) c[d.accion] += 1;
  return c;
}

function detalle(decisiones: readonly Decision<unknown>[]): GrupoDetalle[] {
  const grupos = new Map<string, GrupoDetalle>();
  for (const d of decisiones) {
    if (d.accion === "crear" && d.motivo === null) continue;
    const motivo = d.motivo ?? "-";
    const clave = `${d.entidad}|${d.accion}|${motivo}`;
    const g = grupos.get(clave) ?? {
      entidad: d.entidad,
      accion: d.accion,
      motivo,
      campos: [],
      idsOpai1: [],
    };
    g.idsOpai1.push(d.idOpai1);
    g.campos = [...new Set([...g.campos, ...d.campos])].sort();
    grupos.set(clave, g);
  }
  return [...grupos.values()];
}

export function construirReporte(plan: Plan, tenant: string): Reporte {
  const avisos = new Map<string, string[]>();
  for (const a of plan.avisos) avisos.set(a.codigo, [...(avisos.get(a.codigo) ?? []), a.idOpai1]);
  return {
    modo: "simulacion",
    sistema: "opai1",
    tenant,
    modulosActivos: plan.opciones.modulosActivos,
    conteos: {
      cuenta: conteo(plan.cuentas),
      contacto: conteo(plan.contactos),
      instalacion: conteo(plan.instalaciones),
      programacion_recurrente: conteo(plan.programaciones),
    },
    detalle: [
      ...detalle(plan.cuentas),
      ...detalle(plan.contactos),
      ...detalle(plan.instalaciones),
      ...detalle(plan.programaciones),
    ],
    propuestasFusion: plan.propuestas,
    avisos: [...avisos].map(([codigo, idsOpai1]) => ({ codigo, idsOpai1 })),
    etiquetas: plan.etiquetas,
    pendientes: plan.pendientes,
    tributario: plan.tributario,
    destinatarios: plan.destinatarios,
    correlativosCpq: plan.correlativosCpq,
  };
}

/** Resumen legible para la consola (solo conteos y motivos). */
export function resumenLegible(r: Reporte): string {
  const lineas = [`Simulación de importación desde OPAI 1.0 · tenant ${r.tenant} · sin escrituras`];
  for (const [entidad, c] of Object.entries(r.conteos)) {
    lineas.push(`  ${entidad.padEnd(12)} ${ACCIONES.map((a) => `${a} ${c[a]}`).join(" · ")}`);
  }
  for (const g of r.detalle.filter((x) => x.accion !== "sin_cambios")) {
    lineas.push(`  - ${g.entidad} ${g.accion} (${g.motivo}): ${g.idsOpai1.length}`);
  }
  if (r.propuestasFusion.length > 0)
    lineas.push(`  Propuestas de fusión (revisión humana): ${r.propuestasFusion.length}`);
  for (const a of r.avisos) lineas.push(`  Aviso ${a.codigo}: ${a.idsOpai1.length}`);
  if (r.etiquetas.length > 0)
    lineas.push(`  Etiquetas por confirmar (rubro/segmento/tamaño): ${r.etiquetas.length}`);
  for (const p of r.pendientes) lineas.push(`  Pendiente ${p.entidad} (${p.motivo}): ${p.filas}`);
  lineas.push(
    `  Tributario: ${r.tributario.listasParaFacturar} listas · ${r.tributario.incompletas} incompletas (de ${r.tributario.cuentasConsideradas} cuentas)`,
  );
  lineas.push(
    `  Destinatarios programación: ${r.destinatarios.asignados} asignados · ${r.destinatarios.omitidos} omitidos (de ${r.destinatarios.entrantes} en origen)`,
  );
  for (const c of r.correlativosCpq) {
    lineas.push(
      `  CPQ ${c.anio}: último export ${c.ultimoEnExport} · fijaría ${c.fijariaUltimo}${c.omitido ? ` (${c.motivo})` : ""}`,
    );
  }
  return lineas.join("\n");
}
