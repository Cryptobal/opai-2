import { estadoPantalla } from "@/lib/formato";
import { esUuid } from "@/lib/ids";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

export const PERIODOS = [
  { id: "mes", etiqueta: "Mes" },
  { id: "trimestre", etiqueta: "Trimestre" },
  { id: "anio", etiqueta: "Año" },
] as const;
export type Periodo = (typeof PERIODOS)[number]["id"];

type Cierre = {
  ganados: number;
  perdidos: number;
  montoGanadoMensualClp: number;
  montoPerdidoMensualClp: number;
  conversionPct: number | null;
  cicloPromedioDias: number | null;
};

export type Tablero = {
  periodo: Periodo;
  desde: string;
  hasta: string;
  enCurso: { cantidad: number; montoMensualClp: number };
  cierre: Cierre;
  cierreAnterior: Cierre;
  embudo: { etapaId: string; nombre: string; cantidad: number; montoMensualClp: number; diasPromedio: number | null; avanzaPct: number | null }[];
  perdidas: { motivos: { motivoId: string | null; nombre: string; cantidad: number }[]; competidores: { nombre: string; cantidad: number }[] };
  canales: { canal: string; solicitudes: number; negocios: number; ganados: number; conversionPct: number }[] | null;
  primeraRespuesta: { objetivoHoras: number; atendidas: number; aTiempo: number; tarde: number; pendientesDentro: number; pendientesFuera: number; cumplimientoPct: number | null } | null;
  pronostico: { totalPonderadoClp: number; meses: { mes: string; ponderadoClp: number }[]; fueraDeRango: { cantidad: number; ponderadoClp: number } };
  responsables: { responsableId: string | null; nombre: string; abiertos: number; enCursoMensualClp: number; ponderadoClp: number; ganados: number; perdidos: number; conversionPct: number | null }[];
};

/** Tablero de reportes: una sola capacidad (8 consultas) por navegación. */
export async function cargarReportes(searchParams: SearchParams) {
  const p = await leerParametros(searchParams);
  const periodo: Periodo = PERIODOS.find((x) => x.id === p["periodo"])?.id ?? "mes";
  const responsableId = p["responsable"] && esUuid(p["responsable"]) ? p["responsable"] : null;
  const r = await ejecutarComoUsuario<Tablero>("erp", "comercial.informes.tablero", {
    periodo,
    ...(responsableId ? { responsableId } : {}),
  });
  return { state: estadoPantalla(r), periodo, responsableId, tablero: r.ok ? r.data : null };
}

/** Ruta del tablero conservando período y responsable. */
export const rutaReportes = (periodo: Periodo, responsableId?: string | null) => {
  const q = new URLSearchParams();
  if (periodo !== "mes") q.set("periodo", periodo);
  if (responsableId) q.set("responsable", responsableId);
  const s = q.toString();
  return s ? `/negocios/reportes?${s}` : "/negocios/reportes";
};
