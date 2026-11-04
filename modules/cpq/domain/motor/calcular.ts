import { PCT_ESCALA } from "@opai/domain/dinero";
import { personasPorPosicion } from "./dotacion";
import { validarModelo } from "./formulas";
import { calcularAjustes } from "./ajustes";
import { calcularInstrumentos } from "./instrumentos";
import { calcularBaseConMargen, margenDeSeccion, validarMargenesSeccion } from "./margenes";
import { calcularItem } from "./lineas";
import { CERO, N, sumar } from "./numero";
import { calcularPuesto } from "./puestos";
import { agregarTraza, resumirLineas, trazarTotales } from "./resumen";
import type { ResultadoCalculo } from "./resultado";
import type { ModeloCosteo, ParametrosCalculo, ProveedorCostoEmpleador, Puesto, Traza, VersionCalculo } from "./tipos";

/** R24: sin I/O, reloj, estado global ni mutación de las entradas. */
export function calcular(v: VersionCalculo, modelo: ModeloCosteo, parametros: ParametrosCalculo, proveedor?: ProveedorCostoEmpleador): ResultadoCalculo {
  validarModelo(modelo);
  if (v.modeloId !== modelo.id || v.modeloVersion !== modelo.version) throw new Error("La versión no corresponde al modelo");
  const activas = v.lineas.filter((l) => l.habilitada), traza: Traza[] = [], advertencias: string[] = [];
  if (new Set(v.lineas.map((l) => l.id)).size !== v.lineas.length) throw new Error("Línea duplicada");
  if (v.lineas.some((l) => l.id.endsWith(":feriados"))) throw new Error("Identificador reservado para ajuste de feriados");
  validarMargenesSeccion(v);
  const puestos = activas.filter((l): l is Puesto => l.tipo === "puesto");
  const posiciones = puestos.reduce((s, l) => s + l.posiciones, 0);
  const personas = sumar(puestos.map((l) => personasPorPosicion(l).por(N(l.posiciones))));
  let laboralPendiente = false;
  const lineasBase = activas.flatMap((l) => {
    if (l.tipo !== "puesto") {
      const locales = puestos.filter((p) => p.seccion === l.seccion);
      const personasUsadas = l.alcanceDotacion === "seccion" ? sumar(locales.map((p) => personasPorPosicion(p).por(N(p.posiciones)))) : personas;
      const posicionesUsadas = l.alcanceDotacion === "seccion" ? locales.reduce((s, p) => s + p.posiciones, 0) : posiciones;
      return [calcularItem(l, { ...v, margenPct: margenDeSeccion(v, l.seccion) }, modelo, parametros, personasUsadas, posicionesUsadas, traza, advertencias)];
    }
    const dato = proveedor?.obtener({ lineaId: l.id, fecha: parametros.fecha });
    if (!dato) { laboralPendiente = true; return []; }
    return calcularPuesto(l, v, modelo, traza, dato);
  });
  // Costos manuales por categoría (de un puesto o globales); sin ajustes no cambia nada.
  const lineas = [...lineasBase, ...calcularAjustes(v, modelo, puestos, traza)];
  if (laboralPendiente) advertencias.push("costo laboral pendiente: motor de sueldos");
  const idsAdicionales = new Set(activas.filter((l) => l.tipo === "adicional").map((l) => l.id));
  const costo = (adicional: boolean) => N(lineas.filter((l) => idsAdicionales.has(l.id) === adicional).reduce((s, l) => s + l.costoMensual, 0));
  const c = costo(false);
  const base = calcularBaseConMargen(v, lineas, idsAdicionales, traza);
  const adicionales = N(lineas.reduce((s, l) => s + l.ventaAdicional, 0));
  const unicos = N(lineas.reduce((s, l) => s + l.ventaUnica, 0));
  const instrumentosUsados = v.instrumentos ?? modelo.instrumentos;
  const fin = calcularInstrumentos({ base, adicionales, unicos, instrumentos: instrumentosUsados,
    parametros, mesesContrato: v.meses, ...(v.precioManualClp === undefined ? {} : { precioManualClp: v.precioManualClp }) });
  const venta = fin.venta.entero();
  const instrumentos = sumar([fin.financiero, fin.garantia, fin.administracion, fin.responsabilidad]);
  const costoMensual = c.mas(costo(true)).entero();
  const margen = venta > 0 ? N(venta).menos(N(costoMensual)).menos(instrumentos).div(N(venta)) : CERO;
  const bajoMinimo = margen.comparar(N(parametros.minimoPct, PCT_ESCALA)) < 0;
  if (fin.faltaUf) advertencias.push("falta valor UF");
  if (fin.subvalorado) advertencias.push("precio subvalorado");
  const resumen = resumirLineas(lineas, modelo, traza);
  const resultado: ResultadoCalculo = { ...resumen, lineas, costoMensual, costoBase: c.entero(), totalMensual: c.mas(instrumentos).entero(),
    costoUnico: lineas.reduce((s, l) => s + l.costoUnico, 0), ventaMensual: laboralPendiente ? null : venta, pagosUnicos: unicos.entero(),
    margenEfectivoPct: margen.por(N(PCT_ESCALA)).entero(),
    semaforo: bajoMinimo ? "rojo" : margen.comparar(N(parametros.minimoPct + parametros.alertaPct, PCT_ESCALA)) < 0 ? "amarillo" : "verde",
    instrumentos: { financiero: fin.financiero.entero(), garantia: fin.garantia.entero(), administracion: fin.administracion.entero(),
      responsabilidad: fin.responsabilidad.entero(), garantizado: fin.garantizado.entero(), baseContrato: fin.baseContrato.entero(),
      primaAnual: fin.primaAnual.entero(), kEscalado: fin.k.por(N(PCT_ESCALA)).entero(), grossUp: fin.grossUp, incluyeUnicos: fin.incluyeUnicos },
    dotacion: { posiciones, personasEscaladas: personas.por(N(10_000)).entero() },
    uf: parametros.uf, fecha: parametros.fecha, estado: "borrador", advertencias: [...new Set(advertencias)],
    noEnviable: laboralPendiente || advertencias.includes("falta valor UF"), requiereAprobacion: bajoMinimo || fin.subvalorado, traza };
  agregarTraza(traza, "totales", "ventaMensual", v.precioManualClp !== undefined ? "precioManualClp" : fin.subvalorado ? "(B + RC + Gfijo + únicos) × (1 + k)" : "(B + RC + Gfijo + únicos) / (1 − k)", venta,
    [["B", base.mas(adicionales).exacto()], ["RC", fin.responsabilidad.exacto()], ["Gfijo", fin.fijo.exacto()],
      ["únicos", fin.costoUnicos.exacto()], ["k", fin.k.exacto()], ["precioManualClp", v.precioManualClp ?? 0]], fin.venta.exacto());
  agregarTraza(traza, "totales", "margenEfectivoPct", "(S − costos − instrumentos) / S", resultado.margenEfectivoPct,
    [["S", venta], ["costos", costoMensual], ["instrumentos", instrumentos.exacto()]], margen.exacto());
  for (const campo of ["financiero", "garantia", "administracion", "responsabilidad", "garantizado", "baseContrato", "primaAnual"] as const)
    agregarTraza(traza, "instrumentos", campo, campo === "financiero" ? "S × f" : campo === "garantia" ? "garantizado × tasa / 12" : campo === "administracion" ? "garantizado × administración / meses" : campo === "responsabilidad" ? "primaAnual × asignación / plazo" : campo,
      fin[campo].entero(), [["configuracion", JSON.stringify(modelo.instrumentos)], ["usado", JSON.stringify(instrumentosUsados)],
        ["origen", v.instrumentos ? "cotizacion (sobrescrito)" : "tenant"], ["UF", parametros.uf?.valorClpEscalado ?? 0]], fin[campo].exacto());
  agregarTraza(traza, "totales", "costoBase", "suma de líneas sin adicionales", c.entero(),
    lineas.filter((l) => !idsAdicionales.has(l.id)).map((l) => [l.id, l.costoMensual]));
  agregarTraza(traza, "totales", "totalMensual", "costoBase + instrumentos", resultado.totalMensual,
    [["costoBase", c.entero()], ["instrumentos", instrumentos.exacto()]], c.mas(instrumentos).exacto());
  trazarTotales(resultado); return resultado;
}
