import { listarModulos, type EventoDeDominio } from "../module";

/**
 * Eventos que emite el núcleo (ADR-029). Con los `eventos` de los manifests forman el catálogo al
 * que se suscriben consumidores, Comunicaciones y agentes. Un evento nuevo del núcleo se declara
 * aquí antes de emitirse (lo verifica un test sobre el código fuente).
 */
export const EVENTOS_CORE: readonly EventoDeDominio[] = [
  { id: "core.cuenta.creada", descripcion: "Se creó una cuenta (cliente o prospecto)." },
  { id: "core.cuenta.actualizada", descripcion: "Cambiaron los datos de una cuenta." },
  { id: "core.contacto.creado", descripcion: "Se agregó un contacto a una cuenta." },
  { id: "core.instalacion.creada", descripcion: "Se creó una instalación de una cuenta." },
  { id: "core.instalacion.actualizada", descripcion: "Cambiaron los datos de una instalación." },
  { id: "core.puesto.creado", descripcion: "Se creó un puesto en una instalación." },
  { id: "core.persona.creada", descripcion: "Se registró una persona (trabajador)." },
  { id: "core.persona.actualizada", descripcion: "Cambiaron los datos de una persona." },
  { id: "core.vinculo.iniciado", descripcion: "Comenzó el vínculo laboral de una persona." },
  { id: "core.vinculo.terminado", descripcion: "Terminó el vínculo laboral de una persona." },
  { id: "core.estructura.vigente", descripcion: "Entró en vigencia una estructura de sueldo." },
  { id: "core.documento.subido", descripcion: "Se subió y confirmó un documento." },
  { id: "core.documento.por_vencer", descripcion: "Un documento vence dentro del aviso." },
  { id: "core.documento.vencido", descripcion: "Un documento llegó a su fecha de vencimiento." },
  { id: "core.aprobacion.solicitada", descripcion: "Un agente pidió aprobación humana." },
  { id: "core.aprobacion.resuelta", descripcion: "Una aprobación se aprobó o rechazó." },
  { id: "core.consumo.umbral", descripcion: "El consumo cruzó un umbral del presupuesto." },
  {
    id: "core.integracion.actualizada",
    descripcion: "Cambió la configuración o un secreto de una integración.",
  },
  { id: "core.integracion.fallida", descripcion: "Una integración dejó de responder." },
  { id: "core.bitacora.rota", descripcion: "La verificación de la bitácora encontró un quiebre." },
];

/** Catálogo completo: núcleo más los módulos registrados. */
export function catalogoDeEventos(): readonly EventoDeDominio[] {
  return [...EVENTOS_CORE, ...listarModulos().flatMap((m) => m.eventos)];
}

export function eventoDeclarado(tipo: string): boolean {
  return catalogoDeEventos().some((e) => e.id === tipo);
}
