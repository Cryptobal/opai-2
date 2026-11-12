import { semaforoDeLogro } from "@opai/domain";
import type { BadgeProps } from "@opai/ds";

import { ejecutarComoUsuario } from "@/lib/servidor";

import type {
  CargoJefatura,
  DefinicionIndicador,
  Hecho,
  IndicadorOpcion,
  Propio,
  Scorecard,
} from "./tipos";

export type FilaScorecard = {
  cargoId: string;
  cargo: string;
  vigenteDesde: string | null;
  indicadores: number;
  pendiente: boolean;
};

export type ResultadoCargo = {
  cargoId: string;
  periodo: string;
  vigenteDesde: string | null;
  personas: {
    personaId: string;
    nombres: string;
    apellidos: string;
    puntaje: number | null;
    cobertura: number;
  }[];
  siguiente: string | null;
};

export type ResultadoPersona = {
  personaId: string;
  nombres: string;
  apellidos: string;
  cargoId: string | null;
  periodo: string;
  vigenteDesde: string | null;
  puntaje: number | null;
  cobertura: number;
  /** Parte de sus acciones del mes hecha por su agente (CAR-312); null sin usuario en OPAI. */
  parteAgente: { acciones: number; porAgente: number; porcentaje: number } | null;
  indicadores: {
    indicador: string;
    nombre: string;
    unidad: string | null;
    meta: number;
    peso: number;
    valor: number | null;
    logro: number | null;
    disponible: boolean;
  }[];
};

export const cargarScorecards = () =>
  ejecutarComoUsuario<FilaScorecard[]>("erp", "desempeno.scorecards.list", {});

export const cargarScorecard = (cargoId: string) =>
  ejecutarComoUsuario<{
    cargo: string;
    periodo: string;
    vigente: Scorecard | null;
    pendiente: Scorecard | null;
    definiciones: DefinicionIndicador[];
    definicionesPendiente: DefinicionIndicador[];
  }>("erp", "desempeno.scorecards.get", { cargoId });

export const cargarResultadoCargo = (cargoId: string) =>
  ejecutarComoUsuario<ResultadoCargo>("erp", "desempeno.resultados.ver_cargo", { cargoId });

export const cargarResultadoPersona = (personaId: string) =>
  ejecutarComoUsuario<ResultadoPersona>("erp", "desempeno.resultados.ver_persona", { personaId });

export const cargarCargos = () =>
  ejecutarComoUsuario<CargoJefatura[]>("erp", "core.cargos.list", {});

export const cargarPropios = () =>
  ejecutarComoUsuario<Propio[]>("erp", "desempeno.propios.list", {});

export const cargarHechos = () => ejecutarComoUsuario<Hecho[]>("erp", "desempeno.hechos.list", {});

/** Indicadores que se pueden poner en un scorecard: el catálogo más los propios ya publicados. */
export async function cargarOpciones(): Promise<IndicadorOpcion[]> {
  const [catalogo, propios] = await Promise.all([
    ejecutarComoUsuario<(IndicadorOpcion & { modulo: string })[]>(
      "erp",
      "core.indicadores_gestion.catalogo",
      {},
    ),
    cargarPropios(),
  ]);
  const delCatalogo = (catalogo.ok ? catalogo.data : []).map((i) => ({
    id: i.id,
    nombre: i.nombre,
    descripcion: i.descripcion,
    unidad: i.unidad,
    metaSugerida: i.metaSugerida,
  }));
  const publicados = (propios.ok ? propios.data : [])
    .filter((p) => p.estado === "publicado")
    .map((p) => ({
      id: p.indicador,
      nombre: p.nombre,
      descripcion: p.descripcion ?? "Indicador propio de la empresa.",
      unidad: p.unidad,
      metaSugerida: p.metaSugerida,
    }));
  return [...delCatalogo, ...publicados];
}

const TONO = { verde: "success", amarillo: "warning", rojo: "danger" } as const;

/** Tono del puntaje (0 a 120) con el semáforo del dominio: cumple, cerca o bajo la meta. */
export function tonoPuntaje(puntaje: number | null): NonNullable<BadgeProps["tono"]> {
  return puntaje === null ? "neutro" : TONO[semaforoDeLogro(puntaje / 100)];
}

export type MesCerrado = {
  periodo: string;
  origen: "manual" | "automatico";
  cerradoEn: string;
  personas: number;
};

export const cargarCierres = () =>
  ejecutarComoUsuario<{ cerrados: MesCerrado[]; porCerrar: string | null }>(
    "erp",
    "desempeno.periodos.list",
    {},
  );
