import { esVertical, formatearNumero, formatearUsd, vocabulario } from "@opai/domain";
import { Badge } from "@opai/ds";

/** Estado de una empresa: activa, en prueba o suspendida (el color es estado). */
const ESTADO: Record<
  string,
  { etiqueta: string; tono: "success" | "info" | "warning" | "neutro" }
> = {
  activo: { etiqueta: "Activo", tono: "success" },
  trial: { etiqueta: "Trial", tono: "info" },
  solo_lectura: { etiqueta: "Solo lectura", tono: "warning" },
  suspendido: { etiqueta: "Suspendido", tono: "warning" },
};

export function EstadoTenant({ estado }: { estado: string }) {
  const e = ESTADO[estado] ?? { etiqueta: estado, tono: "neutro" as const };
  return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
}

export const nombreVertical = (v: string) => (esVertical(v) ? vocabulario(v).vertical : v);

/** "US$ 28,00". */
export const usd = (n: number | null | undefined) => (n == null ? "—" : formatearUsd(n));

/** "6,8 M" / "2.296". */
export function cantidad(n: number) {
  if (n >= 1_000_000) return `${formatearNumero(n / 1_000_000, 1)} M`;
  return formatearNumero(n);
}

/** Insignia de la barra superior de Plataforma. */
export function Superadmin() {
  return (
    <Badge tono="accent" punto={false}>
      Superadmin
    </Badge>
  );
}

const CLASE_IA: Record<string, string> = {
  economica: "económica",
  estandar: "estándar",
  potente: "potente",
};
const RECURSO: Record<string, string> = {
  "capacidad.ejecucion": "Ejecución de capacidad",
  "geo.autocompletado": "Mapas · autocompletar dirección",
  "geo.geocodificacion": "Mapas · ubicar dirección",
  "geo.mapa": "Mapas · imagen",
  "geo.ruta": "Mapas · ruta",
  "biometria.vida": "Biometría · prueba de vida",
  "biometria.enrolar": "Biometría · enrolar rostro",
  "biometria.verificar": "Biometría · verificar rostro",
  "correo.enviado": "Correo enviado",
  "almacenamiento.subida": "Archivos · subida",
  "almacenamiento.descarga": "Archivos · descarga",
};

/** Nombre legible de un recurso medido (hoja de Plataforma §2.10): «IA económica · entrada», no el id. */
export function nombreRecurso(recurso: string): string {
  const ia = /^ia\.([a-z]+)\.(entrada|salida)$/.exec(recurso);
  if (ia?.[1] && ia[2]) return `IA ${CLASE_IA[ia[1]] ?? ia[1]} · ${ia[2]}`;
  return RECURSO[recurso] ?? recurso;
}
