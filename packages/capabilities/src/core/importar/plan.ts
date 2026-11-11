// Arma el plan de una importación: lee, mapea, valida y decide qué pasaría con cada fila. No escribe nada.
import { normalizarFilas, resolverMapeo, LIMITES_IMPORTACION, type Mapeo } from "@opai/domain/importacion";

import { enScope } from "../../autorizacion";
import { prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { leerEntrada, type Entrada } from "./entrada";
import type { AlExistir, Conteos, Datos, FilaPlan, FilaReporte, Importador } from "./tipos";

export type Peticion = Entrada & { mapeo?: Mapeo | undefined; alExistir: AlExistir; desde: number };

export type Plan = {
  origen: string;
  sistema: string;
  archivo: string | null;
  columnas: string[];
  mapeo: Mapeo;
  columnasIgnoradas: string[];
  /** Problemas que impiden importar cualquier fila (mapeo inválido, falta una columna obligatoria). */
  bloqueos: string[];
  totalFilas: number;
  /** Primera fila de datos que falta procesar en otra llamada, o null si esta fue la última. */
  siguiente: number | null;
  filas: FilaPlan<Datos>[];
  cambios: Map<number, Record<string, unknown>>;
};

/** El actor necesita el permiso de la entidad y, si el importador es de un módulo, tenerlo activo y en su alcance. */
export function exigirAcceso(ctx: Contexto, imp: Importador): void {
  if (imp.modulo && (!ctx.modulosActivos.includes(imp.modulo) || !enScope(ctx, imp.modulo)))
    throw prohibido(`El módulo «${imp.modulo}» no está activo para esta empresa o para esta credencial.`);
  if (!ctx.autorizar(imp.permiso)) throw prohibido(`No tienes permiso para importar ${imp.def.etiqueta.toLowerCase()}.`);
  if (ctx.alcance) throw prohibido("Con acceso limitado a algunas instalaciones o cuentas no se puede importar.");
}

const vacio = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const comparable = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v === null || v === undefined ? "" : String(v));

/** Qué campos cambiarían en el registro existente según la política elegida. */
function cambiosDe(imp: Importador, f: FilaPlan<Datos>, alExistir: AlExistir): Record<string, unknown> {
  if (!f.existente || !f.datos || alExistir === "omitir") return {};
  const cambios: Record<string, unknown> = {};
  for (const k of imp.actualizables) {
    const nuevo = f.datos[k];
    const actual = f.existente[k];
    if (vacio(nuevo) || comparable(nuevo) === comparable(actual)) continue;
    if (alExistir === "sobrescribir" || vacio(actual)) cambios[k] = nuevo;
  }
  return cambios;
}

export async function armarPlan(ctx: Contexto, imp: Importador, p: Peticion): Promise<Plan> {
  exigirAcceso(ctx, imp);
  const leida = await leerEntrada(imp.def.id, p);
  const m = resolverMapeo(leida.tabla.columnas, imp.def, p.mapeo ?? {});
  const total = leida.tabla.filas.length;
  if (p.desde >= total) throw reglaDeNegocio(`La planilla tiene ${total} filas: no hay nada desde la fila ${p.desde + 1}.`);
  const hasta = Math.min(total, p.desde + LIMITES_IMPORTACION.filas);
  const base = {
    origen: leida.origen, sistema: leida.sistema, archivo: leida.archivo, columnas: leida.tabla.columnas, mapeo: m.mapeo,
    columnasIgnoradas: m.columnasIgnoradas, totalFilas: total, siguiente: hasta < total ? hasta : null,
  };
  const bloqueos = [...m.problemas, ...m.requeridosSinColumna.map((c) => `Falta una columna para «${c}», que es obligatorio.`)];
  if (bloqueos.length) return { ...base, bloqueos, filas: [], cambios: new Map() };
  const ventana = { columnas: leida.tabla.columnas, filas: leida.tabla.filas.slice(p.desde, hasta) };
  const normalizadas = normalizarFilas(ventana, imp.def, m.mapeo).map((f) => ({ ...f, fila: f.fila + p.desde }));
  const validas = normalizadas.filter((f) => f.errores.length === 0);
  const planificadas = await imp.planificar(ctx, validas, { alExistir: p.alExistir, sistema: leida.sistema });
  const conError: FilaPlan<Datos>[] = normalizadas
    .filter((f) => f.errores.length > 0)
    .map((f) => ({ fila: f.fila, clave: `fila:${f.fila}`, etiqueta: "", accion: "error", mensajes: f.errores.map((e) => e.mensaje) }));
  const vistas = new Map<string, number>();
  const cambios = new Map<number, Record<string, unknown>>();
  const filas = [...planificadas, ...conError]
    .sort((a, b) => a.fila - b.fila)
    .map((f): FilaPlan<Datos> => {
      if (f.accion === "error") return f;
      const repetida = vistas.get(f.clave);
      if (repetida !== undefined)
        return { ...f, clave: `fila:${f.fila}`, accion: "error", mensajes: [`Repite el registro de la fila ${repetida}. Deja una sola fila por registro.`] };
      vistas.set(f.clave, f.fila);
      if (f.accion !== "actualizar") return f;
      const c = cambiosDe(imp, f, p.alExistir);
      if (Object.keys(c).length === 0) return { ...f, accion: "sin_cambio" };
      cambios.set(f.fila, c);
      return f;
    });
  return { ...base, bloqueos: [], filas, cambios };
}

export const contar = (filas: readonly { accion: keyof Conteos }[]): Conteos => ({
  crear: filas.filter((f) => f.accion === "crear").length,
  actualizar: filas.filter((f) => f.accion === "actualizar").length,
  sin_cambio: filas.filter((f) => f.accion === "sin_cambio").length,
  error: filas.filter((f) => f.accion === "error").length,
});

export const reporteDe = (plan: Plan): FilaReporte[] =>
  plan.filas.map((f) => ({ fila: f.fila, accion: f.accion, etiqueta: f.etiqueta, mensajes: f.mensajes, cambios: Object.keys(plan.cambios.get(f.fila) ?? {}) }));
