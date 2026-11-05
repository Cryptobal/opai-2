import type { Item, LineaItem, ModeloCosteo, Puesto, Rateo, VersionCalculo } from "../domain/motor/tipos";
import { MARGENES_DEFECTO } from "../domain/margenes-defecto";
import { instrumentosDeVersion } from "./instrumentos-version";
import { mesesContrato, type VersionCtx } from "./version";

type FilaSeccion = { id: string; nombre: string; margenPct: number | null; instalacionId: string | null };
type FilaLinea = {
  id: string; seccionId: string; tipo: string; grupo: string | null; nombre: string; posiciones: number;
  recurrencia: string; habilitada: boolean; patron: string | null; horaInicio: string | null; horaFin: string | null;
  diasCobertura: number | null; diasSemana?: number[] | undefined; personasPorPosicionEscaladas: number | null; personasMotivo: string | null;
  sueldoBaseClp: number | null; itemCodigo: string | null; cantidadEscalada: number | null; rateoJson: string | null;
  precioUnitarioClp: number | null; margenPropioPct: number | null; alcanceDotacion: string | null;
};

/** Costo manual por categoría (CAR-162): `lineaId` nulo = global de la cotización. */
export type FilaCosto = { id: string; lineaId: string | null; categoria: string; montoClp: number };

function slugSeccion(s: FilaSeccion) {
  return s.instalacionId ? s.nombre.replace(/\s+/g, "_").slice(0, 40) : "comun";
}

function parseRateo(raw: string | null): Rateo | undefined {
  if (!raw) return undefined;
  const r = JSON.parse(raw) as Rateo;
  return r;
}

function itemDeCodigo(modelo: ModeloCosteo, codigo: string): Item {
  const item = modelo.items.find((i) => i.id === codigo);
  if (!item) throw new Error(`Ítem de catálogo desconocido: ${codigo}`);
  return structuredClone(item);
}

function aplicarRecurrencia(item: Item, recurrencia: string) {
  if (recurrencia !== "unico") return;
  item.modo = "inversion";
  item.rateo = { tipo: "unico" };
}

export function mapearVersionCalculo(
  version: VersionCtx,
  secciones: FilaSeccion[],
  lineas: FilaLinea[],
  modelo: ModeloCosteo,
  costos: readonly FilaCosto[] = [],
  objetivoDefectoPct: number = MARGENES_DEFECTO.objetivoPct,
): VersionCalculo {
  const porSeccion = new Map(secciones.map((s) => [s.id, s]));
  const margenesSeccion = secciones
    .filter((s) => s.margenPct != null)
    .map((s) => ({ seccion: slugSeccion(s), margenPct: s.margenPct! }));
  const mapped = lineas
    .filter((l) => l.habilitada)
    .map((l) => {
      const sec = porSeccion.get(l.seccionId);
      if (!sec) throw new Error("Línea sin sección");
      const seccion = slugSeccion(sec);
      if (l.tipo === "puesto") {
        const p: Puesto = {
          id: l.id,
          seccion,
          habilitada: true,
          variables: {},
          tipo: "puesto",
          posiciones: l.posiciones,
          patron: l.patron ?? "4x4",
          horaInicio: l.horaInicio ?? "08:00",
          horaFin: l.horaFin ?? "20:00",
          diasCobertura: l.diasSemana?.length ? l.diasSemana.length : (l.diasCobertura ?? 7),
          ...(l.personasPorPosicionEscaladas != null
            ? { personasPorPosicionEscaladas: l.personasPorPosicionEscaladas, motivoPersonas: l.personasMotivo ?? "" }
            : {}),
        };
        return p;
      }
      const item = itemDeCodigo(modelo, l.itemCodigo ?? "equipo");
      if (l.precioUnitarioClp != null) item.costoUnitario = l.precioUnitarioClp;
      aplicarRecurrencia(item, l.recurrencia);
      const rateo = parseRateo(l.rateoJson);
      if (rateo) item.rateo = rateo;
      const li: LineaItem = {
        id: l.id,
        seccion,
        habilitada: true,
        variables: {},
        tipo: l.tipo as "item" | "adicional",
        item,
        cantidadEscalada: l.cantidadEscalada ?? 10_000,
        margenPct: l.margenPropioPct ?? 0,
        ...(l.alcanceDotacion === "seccion" || l.alcanceDotacion === "cotizacion"
          ? { alcanceDotacion: l.alcanceDotacion }
          : {}),
      };
      return li;
    });
  // Los costos de un puesto deshabilitado no cuentan (el puesto tampoco entra al cálculo).
  const inactivos = new Set(lineas.filter((l) => !l.habilitada).map((l) => l.id));
  const ajustes = costos
    .filter((c) => c.lineaId === null || !inactivos.has(c.lineaId))
    .map((c) => ({ id: c.id, categoria: c.categoria, montoClp: c.montoClp, ...(c.lineaId ? { puestoId: c.lineaId } : {}) }));
  return {
    numero: version.numero,
    modeloId: "seguridad",
    modeloVersion: 1,
    meses: version.mesesContrato ?? mesesContrato(version.validaHasta),
    // Un objetivo vacío nunca es 0 %: se usa el de la empresa (CAR-192).
    margenPct: version.margenObjetivoPct ?? objetivoDefectoPct,
    margenModo: version.margenModo as VersionCalculo["margenModo"],
    ...(margenesSeccion.length ? { margenesSeccion } : {}),
    variables: {},
    lineas: mapped,
    ...(ajustes.length ? { ajustes } : {}),
    ...instrumentosDeVersion(version.instrumentosJson),
  };
}

export { slugSeccion };
