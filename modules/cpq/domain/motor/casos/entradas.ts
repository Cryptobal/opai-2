import A from "./CR-A.json";
import B from "./CR-B.json";
import C from "./CR-C.json";
import D from "./CR-D.json";
import E from "./CR-E.json";
import { financieraPrueba, itemPrueba, modeloPrueba, parametrosPrueba, puestoPrueba, versionPrueba } from "../fixtures";
import type { LineaItem, ProveedorCostoEmpleador, VersionCalculo } from "../tipos";

export const casos = [A, B, C, D, E];
type Caso = (typeof casos)[number];
/** Solo fixtures: la referencia de 1.0 no representa un cálculo legal de remuneraciones. */
export function entradaReal(c: Caso) {
  const modelo = modeloPrueba(), instrumentos = financieraPrueba();
  // Cociente observado en TODOS los casos con puestos, no el default de R65.
  // TODO(decisión Carlos): confirmar feriados anuales y colchón originales; solo se identifica su producto.
  modelo.formulas = modelo.formulas.map((f) => f.clave === "ajuste_feriados" ? { ...f, expresion: "mano_obra / 36" } : f);
  modelo.valores = { cambios_anuales: c.caso === "CR-A" ? 2 : 3 };
  const costos: Record<string, number> = {};
  const lineas: VersionCalculo["lineas"][number][] = c.puestos.map((p, i) => {
    const id = `Puesto ${i + 1}`; costos[id] = p.costoEmpleadorPorPersona1_0;
    return puestoPrueba({ id, seccion: `Sección ${p.seccion}`, patron: p.patron, horaInicio: p.inicio, horaFin: p.fin,
      posiciones: p.posiciones, diasCobertura: p.diasCobertura,
      ...(p.personas === 3 ? { personasPorPosicionEscaladas: 30_000, motivoPersonas: "Dotación de referencia CR-B" } : {}) });
  });
  function agregar(precio: number, categoria: string, expresion?: string, variables: Record<string, number> = {}): LineaItem {
    const l = itemPrueba(precio, { id: `Ítem ${lineas.length + 1}`, seccion: "Sección 1", variables });
    l.item.categoria = categoria;
    if (expresion) { l.item.modo = "formula"; l.item.formula = expresion; }
    lineas.push(l); return l;
  }
  c.uniformes.forEach((u) => {
    // B: 350.000 y 400.000 → precio ×5/48; los otros ítems → precio ×5×3/12.
    const amortizado = c.caso === "CR-B" && [350_000, 400_000].includes(u.precio);
    agregar(u.precio, "uniformes", amortizado ? "precio * personas / 48" : "formula.uniforme");
  });
  c.examenes.forEach((e) => agregar(e.precio, "examenes", "formula.examen"));
  c.costos.forEach((e, i) => {
    if (!e.enabled) return;
    // Inferido de importe visible / precio: unidad anual o semestral omitida en JSON.
    const meses = e.isAmortizable ? e.amortizationMonths : c.caso === "CR-B" && i === 1 ? 12
      : c.caso === "CR-B" && i === 9 ? 6 : c.caso === "CR-D" && i === 1 ? 12 : null;
    const precio = e.isAmortizable ? e.investmentAmount ?? 0 : e.unitPrice;
    const categoria = e.isAmortizable ? "examenes" : "equipamiento";
    // El plan de B trae décimas de CLP: convertir a entrada entera escalada, sin perderlas en intermedios.
    const fraccion = !Number.isInteger(precio);
    const l = agregar(fraccion ? Math.round(precio * 10) : precio, categoria, fraccion ? "precio / 10 * cantidad" : undefined);
    l.cantidadEscalada = Math.round(e.quantity * 10_000);
    if (meses) { l.item.modo = "inversion"; l.item.rateo = { tipo: "meses", meses }; }
  });
  c.colaciones.forEach((m) => agregar(m.priceOverride ?? 0, "colacion", "formula.comida",
    { comidas_dia: m.mealsPerDay, dias_mes: m.daysOfService }));
  c.vehiculos.forEach((v) => {
    const l = agregar(0, "vehiculos", "formula.vehiculo", { arriendo: v.rentMonthly, km_dia: v.kmPerDay,
      dias_mes: v.daysPerMonth, km_litro: v.kmPerLiter, combustible: v.fuelPrice, mantencion: v.maintenanceMonthly });
    l.cantidadEscalada = v.vehiclesCount * 10_000;
  });
  c.adicionales.forEach((a) => {
    const l = agregar(a.precio, "otros"); l.tipo = "adicional"; l.margenPct = a.margenPct * 10_000;
    l.cantidadEscalada = a.cantidad * 10_000;
    if (a.recurrencia === "unico") { l.item.modo = "inversion"; l.item.rateo = { tipo: "unico" }; }
  });
  instrumentos.financiero = { habilitado: ["CR-A", "CR-B", "CR-C"].includes(c.caso), tasaPct: c.caso === "CR-A" ? 20_000 : 25_000 };
  if (c.caso === "CR-A") {
    // Normalización algebraica de coeficientes observados: G/S=1/375, residuo/S=1/10.000.
    // TODO(decisión Carlos): Mg,pG,rG,eG y posible RC no se identifican por separado en la extracción.
    instrumentos.garantia = { ...instrumentos.garantia, habilitada: true, meses: 16, administracionPct: 1_000 };
  }
  const version = versionPrueba(lineas); version.margenPct = c.margenPct * 10_000; version.instrumentos = instrumentos;
  const proveedor: ProveedorCostoEmpleador = { obtener: ({ lineaId }) => {
    const costoMensualClp = costos[lineaId];
    return costoMensualClp === undefined ? null : { costoMensualClp, origen: `${c.caso}: referencia 1.0` };
  } };
  return { version, modelo, parametros: parametrosPrueba, proveedor };
}

export function entradaCompuesta() {
  const a = entradaReal(A), c = entradaReal(C);
  const proveedor: ProveedorCostoEmpleador = { obtener: ({ lineaId, fecha }) => {
    const original = lineaId.replace(/^CR-[AC] /, "");
    return (lineaId.startsWith("CR-A ") ? a : c).proveedor.obtener({ lineaId: original, fecha });
  } };
  const componentes = [a, c];
  const lineas = componentes.flatMap((e, i) => e.version.lineas.map((l) => ({ ...l,
    id: `${i === 0 ? "CR-A" : "CR-C"} ${l.id}`, seccion: `Sección ${i + 1}`,
    ...(l.tipo === "puesto" ? {} : { alcanceDotacion: "seccion" as const }),
    variables: { ...l.variables, cambios_anuales: i === 0 ? 2 : 3 } })));
  // Decisión de Carlos, addendum 1-nov-2026 12:30 CLT: cada sección conserva su margen.
  return { ...a, version: { ...a.version, lineas, margenesSeccion: [
    { seccion: "Sección 1", margenPct: 100_000 }, { seccion: "Sección 2", margenPct: 130_000 },
  ] }, proveedor };
}
