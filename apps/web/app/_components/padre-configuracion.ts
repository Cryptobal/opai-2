import type { Volver } from "@opai/ds";

const GRUPOS: Record<string, string> = {
  empresa: "Empresa",
  operacion: "Operación",
  "personas-acceso": "Personas y acceso",
  agentes: "Agentes",
  modulos: "Módulos",
  "uso-registros": "Uso y registros",
};
const ENTRADAS: Record<string, string> = {
  empresa: "empresa",
  marca: "empresa",
  cumplimiento: "empresa",
  comunicaciones: "empresa",
  operaciones: "operacion",
  calendario: "operacion",
  documentos: "operacion",
  usuarios: "personas-acceso",
  agentes: "agentes",
  "api-keys": "agentes",
  aprobaciones: "agentes",
  modulo: "modulos",
  modulos: "modulos",
  integraciones: "uso-registros",
  consumos: "uso-registros",
  auditoria: "uso-registros",
};
export function padreConfiguracion(ruta: string): Volver | undefined {
  if (ruta === "/mi-cuenta/preferencias")
    return { href: "/configuracion", etiqueta: "Configuración" };
  const [, base, seccion, grupo, entrada] = ruta.split("/");
  if (base !== "configuracion" || !seccion) return undefined;
  if (seccion === "grupo" && !entrada) return { href: "/configuracion", etiqueta: "Configuración" };
  const id = seccion === "grupo" ? grupo : ENTRADAS[seccion];
  return id && GRUPOS[id]
    ? { href: `/configuracion/grupo/${id}`, etiqueta: GRUPOS[id] }
    : undefined;
}
