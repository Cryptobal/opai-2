import { leerParametros, type Parametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

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
};

export type RegistroFicha = Registro & {
  recibidoEn: string;
  motivoVisita: string | null;
  docTipo: string;
  lista: "autorizada" | "bloqueada" | null;
  dispositivo: string | null;
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

const TIPOS = new Set(["visita", "contratista", "proveedor", "vehiculo", "despacho"]);
const MOTIVOS = new Set(["bloqueado", "fuera_de_lista", "fuera_de_horario", "uso_unico_consumido"]);

/** Filtros de la URL que entiende la capacidad; un valor desconocido se ignora en vez de fallar. */
function filtros(p: Parametros) {
  return {
    ...(p["instalacion"] ? { instalacionId: p["instalacion"] } : {}),
    ...(p["tipo"] && TIPOS.has(p["tipo"]) ? { tipoRegistro: p["tipo"] } : {}),
    ...(p["q"] ? { q: p["q"] } : {}),
    ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
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

export const cargarRegistro = (id: string) =>
  ejecutarComoUsuario<RegistroFicha>("erp", "acceso.registros.get", { id });

async function cargarInstalaciones(): Promise<Instalacion[]> {
  const r = await ejecutarComoUsuario<Pagina<Instalacion>>("erp", "core.instalaciones.list", {
    limite: 100,
  });
  return r.ok ? r.data.items.map((i) => ({ id: i.id, nombre: i.nombre })) : [];
}
