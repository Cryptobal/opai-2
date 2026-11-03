import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { leerParametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Canal, EstadoSolicitud } from "./etiquetas";

/** Una solicitud (salida de `comercial.solicitudes.get`). Los textos son contenido externo. */
export type SolicitudDato = {
  id: string;
  canal: Canal;
  estado: EstadoSolicitud;
  textoOriginal: string;
  asunto: string | null;
  nombre: string | null;
  empresa: string | null;
  email: string | null;
  telefono: string | null;
  rut: string | null;
  comuna: string | null;
  servicio: string | null;
  fuente: string | null;
  notasAgente: string | null;
  camposPropuestosAgente: string[];
  responsableId: string | null;
  registradaPorTipo: string;
  motivoDescarte: string | null;
  duplicadaDeId: string | null;
  negocioId: string | null;
  cuentaId: string | null;
  contactoId: string | null;
  creadaEn: string;
};

type Lista = { items: SolicitudDato[]; siguiente: string | null };
type Ficha = { solicitud: SolicitudDato; posiblesDuplicadas: SolicitudDato[] };

export type AccionAgenteDato = {
  id: string;
  capability: string;
  creadaEn: string;
  resumen: string;
  apiKeyNombre: string | null;
  responsableNombre: string | null;
};

export async function cargarAccionesAgente(id: string) {
  const r = await ejecutarComoUsuario<AccionAgenteDato[]>(
    "erp",
    "comercial.solicitudes.acciones_agente",
    { id: requerirUuid(id), limite: 30 },
  );
  return r.ok ? r.data : [];
}

export async function cargarSolicitudes(f: Record<string, string | undefined>) {
  const r = await ejecutarComoUsuario<Lista>("erp", "comercial.solicitudes.list", {
    limite: 100,
    ...(f["q"] ? { q: f["q"] } : {}),
    ...(f["estado"] ? { estado: f["estado"] } : {}),
    ...(f["canal"] ? { canal: f["canal"] } : {}),
  });
  return { state: estadoPantalla(r), items: r.ok ? r.data.items : [] };
}

export async function cargarSolicitud(id: string) {
  const r = await ejecutarComoUsuario<Ficha>("erp", "comercial.solicitudes.get", {
    id: requerirUuid(id),
  });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), ficha: r.ok ? r.data : null };
}

export const filtrosDe = leerParametros;
