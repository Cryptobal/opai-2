/** Horario y días de un puesto para la tarjeta de la cotización, sin abrir la hoja (CAR-212). */
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** «Lunes a domingo», «Lun a Vie» o «Lun, Mié, Vie» según los días 1–7 (1 = lunes). */
export function textoDias(dias: readonly number[] | undefined): string | null {
  const unicos = [...new Set((dias ?? []).filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b);
  if (unicos.length === 0) return null;
  if (unicos.length === 7) return "Lunes a domingo";
  const grupos: number[][] = [];
  for (const d of unicos) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo[ultimo.length - 1] === d - 1) ultimo.push(d);
    else grupos.push([d]);
  }
  return grupos
    .map((g) => {
      const [a, z] = [g[0] as number, g[g.length - 1] as number];
      if (g.length >= 3) return `${DIAS[a - 1]} a ${DIAS[z - 1]}`;
      return g.map((d) => DIAS[d - 1]).join(", ");
    })
    .join(", ");
}

/** «08:00–20:00»; si el horario no está completo, nada. */
export function textoHorario(inicio: string | null | undefined, fin: string | null | undefined): string | null {
  return inicio && fin ? `${inicio}–${fin}` : null;
}
