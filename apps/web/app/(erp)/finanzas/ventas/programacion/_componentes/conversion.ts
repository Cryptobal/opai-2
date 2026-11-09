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
      autoEnvioProforma: f.autoEnvioProforma,
      autoEnvioEstadoPago: f.autoEnvioEstadoPago,
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
    autoEnvioProforma: d.autoEnvioProforma,
    autoEnvioEstadoPago: d.autoEnvioEstadoPago,
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
