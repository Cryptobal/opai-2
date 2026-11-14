import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { EntradaLista } from "./panel-listas";

export type Pagina<T> = { items: T[]; siguiente: string | null };

export type Registro = {
  id: string;
  instalacionId: string;
  instalacion: string;
  entradaEn: string;
  salidaEn: string | null;
  tipoRegistro: string;
  nombre: string;
  empresa: string | null;
  documento: string;
  patente: string | null;
  origen: string;
  anulado: boolean;
};

export type RegistroFicha = Registro & {
  recibidoEn: string;
  motivoVisita: string | null;
  docTipo: string;
  lista: "autorizada" | "bloqueada" | null;
  dispositivo: string | null;
  salidaOrigen: string | null;
  anulacion: { en: string; motivo: string } | null;
};

export type Intento = {
  id: string;
  instalacion: string;
  ocurrioEn: string;
  tipoRegistro: string;
  documento: string;
  motivo: string;
};

type Instalacion = { id: string; nombre: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v: string | undefined) => (v && UUID.test(v) ? v : undefined);
const TIPOS = new Set(["visita", "contratista", "proveedor", "vehiculo", "despacho"]);
const MOTIVOS = new Set(["bloqueado", "fuera_de_lista", "fuera_de_horario", "uso_unico_consumido"]);

/** Filtros de la URL que entiende la capacidad; un valor desconocido se ignora en vez de fallar. */
function filtros(p: Parametros) {
  return {
    ...(uuid(p["instalacion"]) ? { instalacionId: p["instalacion"] } : {}),
    ...(p["tipo"] && TIPOS.has(p["tipo"]) ? { tipoRegistro: p["tipo"] } : {}),
    ...(p["q"] ? { q: p["q"] } : {}),
    ...(uuid(p["cursor"]) ? { cursor: p["cursor"] } : {}),
  };
}

export async function cargarRegistros(sp: SearchParams) {
  const p = await leerParametros(sp);
  const [r, inst] = await Promise.all([
    ejecutarComoUsuario<Pagina<Registro>>("erp", "acceso.registros.listar", {
      ...filtros(p),
      soloEnSitio: p["estado"] === "en_sitio",
    }),
    cargarInstalaciones(),
  ]);
  return { p, r, instalaciones: inst };
}

export async function cargarIntentos(sp: SearchParams) {
  const p = await leerParametros(sp);
  const { tipoRegistro: _t, q: _q, ...base } = filtros(p);
  const [r, inst] = await Promise.all([
    ejecutarComoUsuario<Pagina<Intento>>("erp", "acceso.intentos.listar", {
      ...base,
      ...(p["motivo"] && MOTIVOS.has(p["motivo"]) ? { motivo: p["motivo"] } : {}),
    }),
    cargarInstalaciones(),
  ]);
  return { p, r, instalaciones: inst };
}

/** Listas de una instalación: la de la URL o, si no viene, la primera a cargo (la lista siempre es por instalación). */
export async function cargarListas(sp: SearchParams) {
  const p = await leerParametros(sp);
  const instalaciones = await cargarInstalaciones();
  const instalacionId = uuid(p["instalacion"]) ?? instalaciones[0]?.id;
  const tipo: "autorizada" | "bloqueada" = p["lista"] === "bloqueada" ? "bloqueada" : "autorizada";
  const r = instalacionId
    ? await ejecutarComoUsuario<EntradaLista[]>("erp", "acceso.listas.listar", {
        instalacionId,
        tipo,
      })
    : null;
  return { p, r, instalaciones, instalacionId, tipo };
}

export const cargarRegistro = (id: string) =>
  ejecutarComoUsuario<RegistroFicha>("erp", "acceso.registros.get", { id });

async function cargarInstalaciones(): Promise<Instalacion[]> {
  const r = await ejecutarComoUsuario<Pagina<Instalacion>>("erp", "core.instalaciones.list", {
    limite: 100,
  });
  return r.ok ? r.data.items.map((i) => ({ id: i.id, nombre: i.nombre })) : [];
}
