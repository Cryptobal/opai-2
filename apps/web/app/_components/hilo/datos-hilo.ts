import type { AreaIndice, EstadoLista, FilaHilo, PendienteHilo, Volver } from "@opai/ds";

import { hora } from "@/lib/fechas";
import type { ItemNav } from "@/lib/navegacion";
import { nombreDePila } from "@/lib/nombre";

const ZONA = "America/Santiago";

/** Salida de `core.inicio.pendientes` (espejo del esquema de la capacidad). */
export type PendienteInicio = {
  tipo: "aprobaciones" | "documentos" | "invitaciones" | "integraciones" | "anexos" | "solicitudes";
  titulo: string;
  detalle: string;
  tono: "warning" | "danger" | "neutro";
  href: string;
  accion: string;
};

const ORIGEN: Record<PendienteInicio["tipo"], string> = {
  aprobaciones: "Agentes",
  documentos: "Personas",
  invitaciones: "Usuarios",
  integraciones: "Integraciones",
  anexos: "Personas",
  solicitudes: "Comercial",
};

/** Un fallo real se dice; sin permiso o con el módulo apagado, esa parte del hilo no es para esta persona. */
export function estadoDeFallo(code: string): EstadoLista {
  return code === "INTERNAL" || code === "INVALID_OUTPUT" ? "error" : "sin-permiso";
}

export function saludoHilo(ahora: Date, nombre: string): string {
  const h = Number(
    new Intl.DateTimeFormat("es-CL", { hour: "numeric", hourCycle: "h23", timeZone: ZONA }).format(
      ahora,
    ),
  );
  const saludo = h < 12 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches";
  return `${saludo}, ${nombreDePila(nombre)}.`;
}

export function resumenHilo(estado: EstadoLista, n: number): string {
  if (estado === "cargando") return "Revisando tus pendientes.";
  if (estado !== "listo") return "No pudimos revisar tus pendientes.";
  if (n === 0) return "No tienes decisiones pendientes.";
  return n === 1 ? "Una decisión te espera." : `${n} decisiones te esperan.`;
}

/** Para quién es cada portal, como en el diseño (panel «Portales»). */
export const QUIEN_PORTAL: Record<string, string> = {
  erp: "Dueños, gerencia y administración",
  supervisor: "Supervisores en terreno",
  terreno: "Dispositivo fijo de una instalación",
  trabajador: "Portal de cada persona contratada",
  cliente: "Contactos de la cuenta cliente",
  platform: "Operadores de OPAI",
};

export function monogramaHilo(nombre: string): string {
  return (nombre.trim()[0] ?? "O").toLocaleUpperCase("es-CL");
}

/** Pendientes del hilo: los de Inicio, más los avisos sin leer (la campana del marco clásico). */
export function pendientesHilo(items: readonly PendienteInicio[], avisos: number): PendienteHilo[] {
  const deInicio = items.map((p, i) => ({
    id: `${p.tipo}-${i}`,
    origen: ORIGEN[p.tipo],
    ...(p.tipo === "aprobaciones" ? { agente: true } : {}),
    titulo: p.titulo,
    contexto: p.detalle,
    href: p.href,
    accion: p.accion,
  }));
  if (avisos <= 0) return deInicio;
  return [
    ...deInicio,
    {
      id: "avisos",
      origen: "Bandeja",
      titulo: `${avisos} ${avisos === 1 ? "aviso" : "avisos"} sin leer`,
      href: "/bandeja",
      accion: "Ver avisos",
    },
  ];
}

type EntradaNav = Pick<ItemNav, "href" | "etiqueta" | "grupo">;

/** Índice del portal: las áreas del menú en su orden; lo que no es de un área, al final. */
export function indiceHilo(nav: readonly EntradaNav[]): AreaIndice[] {
  const areas = new Map<string, { href: string; etiqueta: string }[]>();
  const general: { href: string; etiqueta: string }[] = [];
  for (const n of nav) {
    const entrada = { href: n.href, etiqueta: n.etiqueta };
    if (!n.grupo) general.push(entrada);
    else areas.set(n.grupo, [...(areas.get(n.grupo) ?? []), entrada]);
  }
  return [
    ...[...areas].map(([nombre, entradas]) => ({ id: nombre, nombre, entradas })),
    ...(general.length ? [{ id: "general", nombre: "General", entradas: general }] : []),
  ];
}

/** Título de una ruta que es entrada del menú; una ficha bajo ella no hereda el de la lista. */
export function tituloDeRuta(nav: readonly EntradaNav[], ruta: string): string {
  return nav.find((n) => n.href === ruta)?.etiqueta ?? "";
}

/** Línea sobre el título del lienzo: adónde se vuelve o el área de la pantalla abierta. */
export function subLienzo(
  nav: readonly EntradaNav[],
  ruta: string,
  volver: Volver | undefined,
): string {
  if (volver) return volver.etiqueta;
  const bajo = (base: string) => base !== "/" && (ruta === base || ruta.startsWith(`${base}/`));
  const activo = [...nav]
    .filter((n) => bajo(n.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return activo?.grupo ?? "";
}

const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d);
/** Hora si es de hoy; si no, día y mes («10-11»). */
export function cuandoCorto(iso: string, ahora: Date): string {
  const d = new Date(iso);
  if (dia(d) === dia(ahora)) return hora(d);
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", timeZone: ZONA })
    .format(d)
    .replace(/\//g, "-");
}

type ItemAgenda = {
  id: string;
  origen: "tarea" | "documento";
  cuando: string;
  titulo: string;
  nota: string | null;
  vencido: boolean;
  href: string;
};

/** Un día sin hora («aaaa-mm-dd», vencimiento de documento) se muestra tal cual, sin zona. */
function cuandoAgenda(cuando: string, ahora: Date): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cuando);
  if (!m) return cuandoCorto(cuando, ahora);
  return `${m[1]}-${m[2]}-${m[3]}` === dia(ahora) ? "Hoy" : `${m[3]}-${m[2]}`;
}

/** «Agenda»: lo que viene (salida de `core.hilo.agenda`, ya ordenada); lo vencido se marca. */
export function agendaHilo(items: readonly ItemAgenda[], ahora: Date): FilaHilo[] {
  return items.map((i) => ({
    id: `${i.origen}-${i.id}`,
    cuando: cuandoAgenda(i.cuando, ahora),
    texto: i.titulo,
    ...(i.vencido ? { nota: "Vencido", tono: "alerta" as const } : i.nota ? { nota: i.nota } : {}),
    href: i.href,
  }));
}
