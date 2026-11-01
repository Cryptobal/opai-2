import { estadoPantalla } from "@/lib/formato";
import { requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { InstalacionFila, Pagina } from "@/lib/tipos-maestros";

import type { LineaHistorial, MesPauta, OpcionInstalacion, Ppc, ResumenTodas } from "./tipos";

/** Mes de hoy en la zona del negocio, o el pedido por `?mes=aaaa-mm`. */
export function mesDeParametros(p: Parametros): { anio: number; mes: number } {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(p["mes"] ?? hoy.slice(0, 7));
  return { anio: Number(m?.[1] ?? hoy.slice(0, 4)), mes: Number(m?.[2] ?? hoy.slice(5, 7)) };
}

/**
 * Carga de la pantalla Pauta (Mensual): sin `?inst` o con `?inst=todas`, el resumen de todas las
 * instalaciones (P05); con una instalación, su grilla (P01). `?ver=ppc` suma los puestos por cubrir
 * (P06) y `?historial=1` el historial de cambios (P04). Consultas por navegación: ≤ 4.
 */
export async function cargarPauta(p: Parametros) {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  const fechaPedida = p["fecha"] ?? "";
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaPedida) &&
    Number(fechaPedida.slice(0, 4)) >= 2000 && Number(fechaPedida.slice(0, 4)) <= 2100 &&
    !Number.isNaN(Date.parse(`${fechaPedida}T00:00:00Z`)) &&
    new Date(`${fechaPedida}T00:00:00Z`).toISOString().slice(0, 10) === fechaPedida;
  const fecha = fechaValida ? fechaPedida : hoy;
  const diaria = p["vista"] === "diaria";
  const { anio, mes } = mesDeParametros(diaria ? { ...p, mes: fecha.slice(0, 7) } : p);
  const inst = p["inst"] && p["inst"] !== "todas" ? requerirUuid(p["inst"]) : null;
  const filtroInst = inst ? { instalacionId: inst } : {};
  const [lista, vista, ppc, historial] = await Promise.all([
    ejecutarComoUsuario<Pagina<InstalacionFila>>("erp", "core.instalaciones.list", { limite: 100 }),
    inst
      ? ejecutarComoUsuario<MesPauta>("erp", "pauta.mes.leer", { instalacionId: inst, anio, mes })
      : ejecutarComoUsuario<ResumenTodas>("erp", "pauta.resumen.leer", { anio, mes }),
    p["ver"] === "ppc" && !diaria
      ? ejecutarComoUsuario<Ppc[]>("erp", "pauta.ppc.listar", { anio, mes, ...filtroInst })
      : null,
    p["historial"] === "1"
      ? ejecutarComoUsuario<{ items: LineaHistorial[] }>("erp", "pauta.historial.listar", { ...filtroInst })
      : null,
  ]);
  const instalaciones: OpcionInstalacion[] = lista.ok
    ? lista.data.items.map((i) => ({ id: i.id, nombre: i.nombre }))
    : [];
  return {
    state: estadoPantalla(vista),
    anio,
    mes,
    inst,
    instalaciones,
    mensual: inst && vista.ok ? (vista.data as MesPauta) : null,
    todas: !inst && vista.ok ? (vista.data as ResumenTodas) : null,
    ppc: ppc?.ok ? ppc.data : null,
    historial: historial?.ok ? historial.data.items : null,
    verPpc: p["ver"] === "ppc",
    diaria,
    fecha,
    dia: p["dia"] ?? null,
    serie: p["serie"] ?? null,
  };
}
export type DatosPauta = Awaited<ReturnType<typeof cargarPauta>>;
