import { formatearFecha } from "../formato";
import { diasVacacionesAcumulados } from "./vacaciones-proporcional";
import type { LineaFiniquito } from "./finiquito";

/** Líneas orientativas del finiquito (extraído para límite de simplicidad). */
export function lineasPropuestaFiniquito(
  datos: {
    motivoTermino: string | null;
    termino: string;
    diasTrabajadosMes: number | null;
    diasVacacionesTomados?: number;
  },
  meses: number,
  sueldo: number,
): LineaFiniquito[] {
  const lineas: LineaFiniquito[] = [];
  const anios = Math.floor(meses / 12);
  if (anios > 0 && sueldo > 0) {
    lineas.push({
      id: "indemnizacion_anios",
      concepto: `Indemnización por años de servicio · ${anios} año${anios === 1 ? "" : "s"}`,
      origen: "Estimación Art. 163 · por verificar",
      monto: Math.round(sueldo * anios),
    });
  }
  if (sueldo > 0) {
    lineas.push({
      id: "indemnizacion_aviso",
      concepto: "Indemnización sustitutiva del aviso previo",
      origen: datos.motivoTermino ? `Causal: ${datos.motivoTermino}` : "Art. 161 · por verificar",
      monto: sueldo,
    });
  }
  const acumVac = diasVacacionesAcumulados(meses);
  const tomados = datos.diasVacacionesTomados ?? 0;
  const pendientesVac = Math.max(0, Math.round((acumVac - tomados) * 100) / 100);
  if (pendientesVac > 0 && sueldo > 0) {
    lineas.push({
      id: "feriado_proporcional",
      concepto: `Feriado proporcional · ${pendientesVac} días`,
      origen: `Estimación ${acumVac} días acum. · ${tomados} tomados (sin contador oficial)`,
      monto: Math.round((sueldo * pendientesVac) / 30),
    });
  }
  if (datos.diasTrabajadosMes != null && datos.diasTrabajadosMes > 0 && sueldo > 0) {
    lineas.push({
      id: "dias_trabajados",
      concepto: `Remuneración días trabajados · ${datos.diasTrabajadosMes} días`,
      origen: `Proporción mes de término (${formatearFecha(datos.termino)})`,
      monto: Math.round((sueldo * datos.diasTrabajadosMes) / 30),
    });
  }
  return lineas;
}