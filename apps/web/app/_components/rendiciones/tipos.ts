/** Tipos y constantes de las pantallas de quien rinde (CAR-197). Los datos llegan de las capacidades `rendiciones.*`. */

export type PortalRendicion = "erp" | "supervisor";

/** Raíz de las rutas de Rendiciones en cada portal. */
export const BASE: Record<PortalRendicion, string> = {
  erp: "/rendiciones",
  supervisor: "/supervisor/rendiciones",
};

export type EstadoRendicion =
  "borrador" | "enviada" | "aprobada" | "rechazada" | "devuelta" | "pagada" | "anulada";

export type ResumenRendicion = {
  id: string;
  codigoVisible: string;
  tipo: string;
  estado: EstadoRendicion;
  aprobadorId: string | null;
  aprobadorNombre: string | null;
  creadaEn: string;
  enviadaEn: string | null;
  decididaEn: string | null;
  centroCosto: string;
  instalacionId: string | null;
  descripcion: string;
  montoTotal: number;
  motivoDecision: string | null;
};

export type ItemRendicion = {
  id: string;
  fecha: string;
  proveedor: string;
  folio: string | null;
  tipoDocumento: "boleta" | "factura";
  descripcion: string;
  monto: number;
  documentoId: string | null;
  sinRespaldoMotivo: string | null;
};

export type ViajeRendicion = {
  origen: string;
  origenLat: number;
  origenLng: number;
  destino: string;
  destinoLat: number;
  destinoLng: number;
  fecha: string;
  tramo: string | null;
  km: number;
  idaYVuelta: boolean;
  peajeClp: number;
  metodo: string;
  origenDistancia: "google" | "linea_recta";
  montoCalculado: number;
};

export type DetalleRendicion = ResumenRendicion & {
  items: ItemRendicion[];
  viaje: ViajeRendicion | null;
};

export type Persona = { id: string; nombre: string };
export type InstalacionOpcion = Persona & {
  direccion: string | null;
  lat: number | null;
  lng: number | null;
};

export type OpcionesRendicion = {
  instalaciones: InstalacionOpcion[];
  aprobadores: Persona[];
  aprobadorPorDefectoId: string | null;
  exigirRespaldo: boolean;
  destinoRespaldo: { tipo: "tenant" | "instalacion"; id: string } | null;
  kilometraje: {
    metodo: "consumo" | "tarifa_km" | "tramo_fijo";
    tramos: { nombre: string; montoClp: number }[];
  } | null;
};

/** Pestañas por ruta (server-first): el segmento va al final de la base del portal. */
export const PESTANAS = [
  { id: "borradores", etiqueta: "Borradores", estado: "borrador", segmento: "" },
  { id: "enviadas", etiqueta: "Enviadas", estado: "enviada", segmento: "/enviadas" },
  { id: "devueltas", etiqueta: "Devueltas", estado: "devuelta", segmento: "/devueltas" },
  { id: "aprobadas", etiqueta: "Aprobadas", estado: "aprobada", segmento: "/aprobadas" },
  { id: "pagadas", etiqueta: "Pagadas", estado: "pagada", segmento: "/pagadas" },
  { id: "rechazadas", etiqueta: "Rechazadas", estado: "rechazada", segmento: "/rechazadas" },
] as const;
export type PestanaId = (typeof PESTANAS)[number]["id"];

export const ETIQUETA_ESTADO: Record<EstadoRendicion, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  devuelta: "Devuelta",
  pagada: "Pagada",
  anulada: "Anulada",
};

export const TONO_ESTADO: Record<
  EstadoRendicion,
  "neutro" | "info" | "success" | "danger" | "warning"
> = {
  borrador: "neutro",
  enviada: "info",
  aprobada: "success",
  rechazada: "danger",
  devuelta: "warning",
  pagada: "success",
  anulada: "neutro",
};

export const ETIQUETA_TIPO: Record<string, string> = {
  compra: "Compra",
  kilometraje: "Kilometraje",
};

/** Centro de costo para mostrar: la instalación o «Administración / Oficina central». */
export function centroDe(
  r: Pick<ResumenRendicion, "centroCosto" | "instalacionId">,
  o?: OpcionesRendicion | null,
): string {
  if (r.centroCosto === "administracion") return "Administración / Oficina central";
  return o?.instalaciones.find((i) => i.id === r.instalacionId)?.nombre ?? "Instalación";
}
