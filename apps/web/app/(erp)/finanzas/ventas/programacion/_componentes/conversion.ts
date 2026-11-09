// Conversión formulario ↔ capacidad de programaciones (BRIEF-26 · CAR-159).
import {
  descuentoTexto,
  type DetalleProgramacion,
  FORM_VACIO,
  type FormProgramacion,
  parseClp,
  parseDescuento,
  parseUf,
  ufTexto,
} from "./tipos";

const entero = (t: string) => (/^-?\d+$/.test(t.trim()) ? Number(t.trim()) : null);

/** Input de `crear`/`actualizar`, o el primer error en lenguaje de negocio. */
export function aInput(
  f: FormProgramacion,
): { ok: true; input: Record<string, unknown> } | { ok: false; error: string } {
  if (!f.nombre.trim()) return { ok: false, error: "Ponle un nombre a la programación." };
  if (!f.cuentaId) return { ok: false, error: "Elige el cliente." };
  const dia = entero(f.diaGeneracion);
  if (dia === null || !(dia === -1 || (dia >= 1 && dia <= 31)))
    return { ok: false, error: "El día de generación va de 1 a 31, o «Último día»." };
  const plazo = entero(f.plazoPagoDias);
  if (plazo === null || plazo < 0 || plazo > 365)
    return { ok: false, error: "El plazo de pago va de 0 a 365 días." };
  const diasF = entero(f.diasFacturacion);
  if (f.facturaModo === "dias" && (diasF === null || diasF < 0 || diasF > 120))
    return { ok: false, error: "Los días hasta la factura van de 0 a 120." };
  const previoDia = entero(f.previoDia);
  const conPrevios = f.autoEnvioProforma || f.autoEnvioEstadoPago;
  if (conPrevios && f.previoCuando === "fecha_acordada" && (previoDia === null || previoDia < 1 || previoDia > 31))
    return { ok: false, error: "El día acordado de envío debe estar entre 1 y 31." };
  const diaF = entero(f.diaFactura);
  if (f.facturaModo === "dia_fijo" && (diaF === null || !(diaF === -1 || (diaF >= 1 && diaF <= 31))))
    return { ok: false, error: "El día de la factura va de 1 a 31, o «Último día»." };
  const lineas = [];
  for (const [i, l] of f.lineas.entries()) {
    const precio = f.moneda === "UF" ? parseUf(l.precio) : parseClp(l.precio);
    const descuento = parseDescuento(l.descuento);
    if (!l.glosa.trim()) return { ok: false, error: `La línea ${i + 1} no tiene descripción.` };
    if (precio === null)
      return { ok: false, error: `El precio de la línea ${i + 1} no es válido.` };
    if (!/^\d{1,10}([.,]\d{1,4})?$/.test(l.cantidad.trim()))
      return { ok: false, error: `La cantidad de la línea ${i + 1} no es válida.` };
    if (descuento === null)
      return { ok: false, error: `El descuento de la línea ${i + 1} no es válido.` };
    lineas.push({
      glosa: l.glosa.trim(),
      cantidad: l.cantidad.trim(),
      precioUnitario: precio,
      descuentoPct: descuento,
      exento: f.tipoDte === "34" || l.exento,
    });
  }
  const porSemana = f.frecuencia === "semanal" || f.frecuencia === "quincenal";
  return {
    ok: true,
    input: {
      nombre: f.nombre.trim(),
      cuentaId: f.cuentaId,
      tipoDte: Number(f.tipoDte),
      frecuencia: f.frecuencia,
      diaGeneracion: dia,
      diaSemana: porSemana ? entero(f.diaSemana) : null,
      mesDelAnio: f.frecuencia === "anual" ? entero(f.mesDelAnio) : null,
      moneda: f.moneda,
      politicaUf: f.moneda === "UF" ? f.politicaUf : null,
      diaUf: f.moneda === "UF" && f.politicaUf === "CUSTOM_DAY" ? entero(f.diaUf) : null,
      plazoPagoDias: plazo,
      fechaInicio: f.fechaInicio || null,
      fechaFin: f.fechaFin || null,
      notas: f.notas.trim() || null,
      diasFacturacion: f.facturaModo === "dias" ? diasF : null,
      momentoFactura: f.facturaModo === "dia_fijo" ? "DIA_FIJO" : "AL_EMITIR",
      diaFactura: f.facturaModo === "dia_fijo" ? diaF : null,
      mesRelativoFactura: f.mesRelativoFactura,
      autoEnvioProforma: f.autoEnvioProforma,
      autoEnvioEstadoPago: f.autoEnvioEstadoPago,
      previoCuando: conPrevios ? f.previoCuando : "generar",
      previoDia: conPrevios && f.previoCuando === "fecha_acordada" ? previoDia : null,
      esperarOk: f.esperarOk,
      exigeOc: f.exigeOc,
      lineas,
      destinatarioIds: f.destinatarioIds,
    },
  };
}

/** Estado inicial del formulario desde el detalle de una programación existente. */
export function desdeDetalle(d: DetalleProgramacion): FormProgramacion {
  const moneda = d.moneda === "UF" ? "UF" : "CLP";
  return {
    ...FORM_VACIO,
    nombre: d.nombre,
    cuentaId: d.cuentaId,
    tipoDte: d.tipoDte === 34 ? "34" : "33",
    frecuencia: (["mensual", "quincenal", "semanal", "anual"].includes(d.frecuencia)
      ? d.frecuencia
      : "mensual") as FormProgramacion["frecuencia"],
    diaGeneracion: String(d.diaGeneracion),
    diaSemana: String(d.diaSemana ?? 1),
    mesDelAnio: String(d.mesDelAnio ?? 1),
    moneda,
    politicaUf: d.politicaUf ?? "RUN_DAY",
    diaUf: String(d.diaUf ?? 1),
    plazoPagoDias: String(d.plazoPagoDias),
    fechaInicio: d.fechaInicio ?? "",
    fechaFin: d.fechaFin ?? "",
    notas: d.notas ?? "",
    facturaModo: d.diasFacturacion !== null ? "dias" : d.momentoFactura === "DIA_FIJO" ? "dia_fijo" : "mismo_dia",
    diasFacturacion: String(d.diasFacturacion ?? 15),
    diaFactura: String(d.diaFactura ?? 1),
    mesRelativoFactura: d.mesRelativoFactura === "MES_ACTUAL" ? "MES_ACTUAL" : "MES_SIGUIENTE",
    autoEnvioProforma: d.autoEnvioProforma,
    autoEnvioEstadoPago: d.autoEnvioEstadoPago,
    previoCuando: d.previoCuando === "fecha_acordada" ? "fecha_acordada" : "generar",
    previoDia: String(d.previoDia ?? 1),
    esperarOk: d.esperarOk,
    exigeOc: d.exigeOc,
    lineas: d.lineasEditables.map((l) => ({
      glosa: l.glosa,
      cantidad: l.cantidad.includes(".") ? l.cantidad.replace(/\.?0+$/, "") : l.cantidad,
      precio: moneda === "UF" ? ufTexto(l.precioUnitario) : String(l.precioUnitario),
      descuento: descuentoTexto(l.descuentoPct),
      exento: l.exento,
    })),
    destinatarioIds: d.destinatarios.map((x) => x.contactoId),
  };
}
