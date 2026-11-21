import { puedePrerregistrar } from "@/lib/pestanas-modulos";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type EstadoDia = "pendiente" | "ingreso" | "no_llego" | "cancelado";

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
    ingresos: string[];
    proximoDia: string | null;
  }[];
  dias: { dia: string; estado: EstadoDia; ingresos: number }[];
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

/** Prerregistros vigentes y próximos de una instalación, y si quien mira puede prerregistrar. */
export async function cargarPrerregistros(instalacionId: string, cursor: string | undefined) {
  const [r, crea] = await Promise.all([
    ejecutarComoUsuario<Pagina<Prerregistro>>("erp", "acceso.prerregistros.listar", {
      instalacionId,
      ...(uuid(cursor) ? { cursor } : {}),
    }),
    puedePrerregistrar(),
  ]);
  return { r, crea };
}

export const cargarPrerregistro = (id: string) =>
  ejecutarComoUsuario<Prerregistro>("erp", "acceso.prerregistros.get", { id });

export const cargarInvitacion = (visitanteId: string, d: string) =>
  ejecutarComoUsuario<Invitacion>("erp", "acceso.prerregistros.invitacion", {
    visitanteId,
    dia: d,
  });
