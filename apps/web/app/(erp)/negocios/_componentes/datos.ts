import { estadoPantalla } from "@/lib/formato";
import { esUuid, requerirEncontrado, requerirUuid } from "@/lib/ids";
import { leerParametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type NegocioFila = {
  id: string;
  titulo: string;
  cuentaId: string;
  responsableNombre?: string | null;
  estado: "abierto" | "ganado" | "perdido";
  etapaId: string;
  etapaNombre: string;
  cuentaNombre: string;
  montoEstimadoMensual: number | null;
  valorMensual: number | null;
  probabilidad: number;
  cierreEstimado: string | null;
};

export type Historial = {
  id: string;
  de: string | null;
  a: string;
  cuando: string;
  dias: number | null;
  motivo: string | null;
};

export type NegocioDetalle = NegocioFila & {
  etapaTipo: string;
  tipoId: string | null;
  origenId: string | null;
  responsableId: string | null;
  cotizacionEnviadaEn: string | null;
  inicioServicioEstimado: string | null;
  motivoPerdidaDetalle: string | null;
  competidor: string | null;
  archivadoEn: string | null;
  instalaciones: { id: string; instalacionId: string; nombre: string; tipo: string }[];
  contactos: {
    id: string;
    contactoId: string;
    nombre: string;
    rol: string;
    esPrincipal: boolean;
  }[];
  historial: Historial[];
};

type Lista = { items: NegocioFila[]; siguiente: string | null };

/** Lista de negocios filtrada (etapa, estado, responsable) para la columna del embudo/lista. */
export async function cargarNegocios(f: Record<string, string | undefined>) {
  const r = await ejecutarComoUsuario<Lista>("erp", "comercial.negocios.list", {
    limite: 100,
    ...(f["q"] ? { q: f["q"] } : {}),
    ...(f["etapa"] && esUuid(f["etapa"]) ? { etapaId: f["etapa"] } : {}),
    ...(f["estado"] ? { estado: f["estado"] } : {}),
  });
  return { state: estadoPantalla(r), items: r.ok ? r.data.items : [] };
}

/** Etapas activas del embudo por defecto, en orden (filtro de la lista y «Cambiar etapa» de la ficha). */
export async function cargarEtapasActivas() {
  const r = await ejecutarComoUsuario<{
    embudo: { etapas: { id: string; nombre: string; tipo: string; activa: boolean }[] };
  }>("erp", "comercial.config.get", {});
  return r.ok
    ? r.data.embudo.etapas
        .filter((e) => e.activa)
        .map((e) => ({ id: e.id, nombre: e.nombre, tipo: e.tipo }))
    : [];
}

/** Opciones del filtro «Etapa» de la lista (`?etapa=`). */
export const cargarEtapas = async () =>
  (await cargarEtapasActivas()).map((e) => ({ valor: e.id, etiqueta: e.nombre }));

export async function cargarEmbudo() {
  const r = await ejecutarComoUsuario<{
    etapas: {
      id: string;
      nombre: string;
      tipo: string;
      orden: number;
      probabilidad: number;
      tono: string;
    }[];
    negocios: NegocioFila[];
  }>("erp", "comercial.negocios.embudo", {});
  return {
    state: estadoPantalla(r),
    etapas: r.ok ? r.data.etapas : [],
    negocios: r.ok ? r.data.negocios : [],
  };
}

export async function cargarNegocio(id: string) {
  const r = await ejecutarComoUsuario<NegocioDetalle>("erp", "comercial.negocios.get", {
    id: requerirUuid(id),
  });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), negocio: r.ok ? r.data : null };
}

export const filtrosDe = leerParametros;
