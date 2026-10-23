import { listarModulos, type EventoDeDominio } from "../module";

/**
 * Eventos que emite el núcleo (ADR-029). Con los `eventos` de los manifests forman el catálogo al
 * que se suscriben consumidores, Comunicaciones y agentes. Un evento nuevo del núcleo se declara
 * aquí antes de emitirse (lo verifica un test sobre el código fuente).
 */
export const EVENTOS_CORE: readonly EventoDeDominio[] = [
  { id: "core.cuenta.creada", descripcion: "Se creó una cuenta (cliente o prospecto)." },
  { id: "core.cuenta.actualizada", descripcion: "Cambiaron los datos de una cuenta." },
  {
    id: "core.cuenta.estado_cambiado",
    descripcion: "Una cuenta pasó a cliente activo, inactivo o prospecto.",
  },
  { id: "core.cuenta.archivada", descripcion: "Se archivó una cuenta." },
  { id: "core.contacto.creado", descripcion: "Se agregó un contacto a una cuenta." },
  { id: "core.contacto.actualizado", descripcion: "Cambiaron los datos de un contacto." },
  { id: "core.instalacion.creada", descripcion: "Se creó una instalación de una cuenta." },
  { id: "core.instalacion.actualizada", descripcion: "Cambiaron los datos de una instalación." },
  { id: "core.instalacion.estado_cambiado", descripcion: "Una instalación cambió de estado." },
  { id: "core.instalacion.archivada", descripcion: "Se archivó una instalación." },
  { id: "core.puesto.creado", descripcion: "Se creó un puesto en una instalación." },
  { id: "core.puesto.actualizado", descripcion: "Cambió un puesto (horario, dotación o estado)." },
  { id: "core.persona.creada", descripcion: "Se registró una persona (trabajador)." },
  { id: "core.persona.actualizada", descripcion: "Cambiaron los datos de una persona." },
  { id: "core.persona.bloqueada", descripcion: "Se bloqueó a una persona, con motivo." },
  { id: "core.persona.desbloqueada", descripcion: "Se desbloqueó a una persona." },
  { id: "core.persona.archivada", descripcion: "Se archivó a una persona sin vínculo vigente." },
  { id: "core.vinculo.creado", descripcion: "Comenzó un vínculo laboral." },
  { id: "core.vinculo.terminado", descripcion: "Terminó un vínculo laboral." },
  { id: "core.cargo.creado", descripcion: "Se creó un cargo." },
  { id: "core.cargo.actualizado", descripcion: "Cambió un cargo o su estado." },
  { id: "core.estructura.creada", descripcion: "Se creó una versión de estructura de sueldo." },
  { id: "core.estructura.anulada", descripcion: "Se anuló una estructura de sueldo." },
  { id: "core.documento.registrado", descripcion: "Se subió y confirmó un documento." },
  { id: "core.documento.actualizado", descripcion: "Cambiaron los datos de un documento." },
  { id: "core.documento.archivado", descripcion: "Se archivó un documento." },
  { id: "core.documento.por_vencer", descripcion: "Un documento vence dentro del aviso." },
  { id: "core.documento.vencido", descripcion: "Un documento llegó a su fecha de vencimiento." },
  { id: "core.config.cambiada", descripcion: "Cambió un ajuste de configuración." },
  {
    id: "core.empresa.actualizada",
    descripcion: "Cambió el perfil legal o de contacto de la empresa.",
  },
  { id: "core.marca.actualizada", descripcion: "Cambió la marca de la empresa (logos o colores)." },
  {
    id: "core.plantilla.actualizada",
    descripcion: "Se publicó una nueva versión de una plantilla.",
  },
  {
    id: "core.integracion.actualizada",
    descripcion: "Cambió la configuración o un secreto de una integración.",
  },
  { id: "core.integracion.error", descripcion: "La prueba o el uso de una integración falló." },
  {
    id: "core.agente.autonomia_cambiada",
    descripcion: "Cambió la autonomía de un agente (API key).",
  },
  { id: "core.aprobacion.solicitada", descripcion: "Un agente pidió aprobación humana." },
  { id: "core.aprobacion.resuelta", descripcion: "Una aprobación se aprobó o rechazó." },
  { id: "core.consumo.umbral", descripcion: "El consumo cruzó un umbral del presupuesto." },
  { id: "core.bitacora.rota", descripcion: "La verificación de la bitácora encontró un quiebre." },
];

/** Catálogo completo: núcleo más los módulos registrados. */
export function catalogoDeEventos(): readonly EventoDeDominio[] {
  return [...EVENTOS_CORE, ...listarModulos().flatMap((m) => m.eventos)];
}

export function eventoDeclarado(tipo: string): boolean {
  return catalogoDeEventos().some((e) => e.id === tipo);
}
