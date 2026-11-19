import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedePrerregistrar } from "@/lib/pestanas-modulos";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type EstadoDia = "pendiente" | "no_llego" | "cancelado";

export type Prerregistro = {
  id: string;
  instalacionId: string;
  instalacion: string;
  desde: string;
  hasta: string;
  desdeMin: number | null;
  hastaMin: number | null;
  anfitrion: string;
  motivo: string | null;
  nota: string | null;
  avisarLlegada: boolean;
  cancelado: boolean;
  visitantes: {
    id: string;
    nombre: string;
    docTipo: string;
    documento: string;
    empresa: string | null;
    patente: string | null;
  }[];
  dias: { dia: string; estado: EstadoDia }[];
};

export type Invitacion = {
  empresa: string;
  visitante: string;
  instalacion: string;
  dia: string;
  desdeMin: number | null;
  hastaMin: number | null;
  anfitrion: string;
  codigo: string;
};

type Pagina<T> = { items: T[]; siguiente: string | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIA = /^\d{4}-\d{2}-\d{2}$/;
export const uuid = (v: string | undefined) => (v && UUID.test(v) ? v : undefined);
export const dia = (v: string | undefined) => (v && DIA.test(v) ? v : undefined);

/** Prerregistros vigentes y próximos (o los de un día), con las instalaciones a cargo para filtrar y crear. */
export async function cargarPrerregistros(sp: SearchParams) {
  const p = await leerParametros(sp);
  const [r, inst, crea] = await Promise.all([
    ejecutarComoUsuario<Pagina<Prerregistro>>("erp", "acceso.prerregistros.listar", {
      ...(uuid(p["instalacion"]) ? { instalacionId: p["instalacion"] } : {}),
      ...(dia(p["dia"]) ? { dia: p["dia"] } : {}),
      ...(uuid(p["cursor"]) ? { cursor: p["cursor"] } : {}),
    }),
    ejecutarComoUsuario<Pagina<{ id: string; nombre: string }>>("erp", "core.instalaciones.list", {
      limite: 100,
    }),
    puedePrerregistrar(),
  ]);
  const instalaciones = inst.ok ? inst.data.items.map((i) => ({ id: i.id, nombre: i.nombre })) : [];
  return { p, r, instalaciones, crea };
}

export const cargarPrerregistro = (id: string) =>
  ejecutarComoUsuario<Prerregistro>("erp", "acceso.prerregistros.get", { id });

export const cargarInvitacion = (visitanteId: string, d: string) =>
  ejecutarComoUsuario<Invitacion>("erp", "acceso.prerregistros.invitacion", {
    visitanteId,
    dia: d,
  });
