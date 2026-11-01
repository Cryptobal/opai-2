// Oráculo aislado de comparación; fórmulas verificadas en 1.0, no usado por producción.
// Deliberadamente conserva float/floor y provisiones sobre directo (spec anexo A).
export function referencia10(base: number, colacion = 0, movilizacion = 0) {
  const gratificacion = Math.min(base * 0.25, 553_553 * 4.75 / 12);
  const imponible = base + gratificacion;
  const directo = imponible * (1 + 0.035 + 0.024 + 0.012) + colacion + movilizacion;
  const vacaciones = directo * 0.0833;
  const indemnizacion = directo * 0.04166;
  const afp = Math.floor(imponible * 0.1058);
  const salud = Math.floor(imponible * 0.07);
  const cesantia = Math.floor(imponible * 0.006);
  const tributable = imponible - afp - salud - cesantia;
  const impuesto = tributable <= 939_748.5 ? 0 : Math.max(0, Math.round(tributable * 0.04 - 37_589.94));
  return { costo: Math.round(directo + vacaciones + indemnizacion),
    liquido: Math.round(imponible + colacion + movilizacion - afp - salud - cesantia - impuesto),
    gratificacion, imponible, directo, vacaciones, indemnizacion, impuesto,
    afp, salud, cesantia };
}
