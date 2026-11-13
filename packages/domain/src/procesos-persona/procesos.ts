// Ingreso y salida de una persona como lista de pasos (CAR-355, referente Rippling). Lógica pura: la
// plantilla de cada empresa (o, si no la definió, la de su vertical) y el cálculo del plazo de cada paso.
export const TIPOS_PROCESO_PERSONA = ["ingreso", "salida"] as const;
export type TipoProcesoPersona = (typeof TIPOS_PROCESO_PERSONA)[number];

export const ESTADOS_PASO_PROCESO = ["por_hacer", "hecho", "omitido"] as const;
export type EstadoPasoProceso = (typeof ESTADOS_PASO_PROCESO)[number];

/** Un paso de la plantilla: qué hacer y en cuántos días desde la fecha del vínculo (inicio o término). */
export type PasoPlantilla = { titulo: string; plazoDias: number };

export const LIMITES_PLANTILLA = { pasos: 30, tituloMin: 3, tituloMax: 120, plazoMin: -30, plazoMax: 90 } as const;

/** Valida una plantilla guardada (JSON de la empresa). Devuelve null si no sirve. */
export function plantillaValida(valor: unknown): PasoPlantilla[] | null {
  if (!Array.isArray(valor) || valor.length > LIMITES_PLANTILLA.pasos) return null;
  const pasos: PasoPlantilla[] = [];
  for (const x of valor as unknown[]) {
    const p = x as { titulo?: unknown; plazoDias?: unknown } | null;
    const titulo = typeof p?.titulo === "string" ? p.titulo.trim() : "";
    const plazo = p?.plazoDias;
    if (titulo.length < LIMITES_PLANTILLA.tituloMin || titulo.length > LIMITES_PLANTILLA.tituloMax) return null;
    if (typeof plazo !== "number" || !Number.isInteger(plazo)) return null;
    if (plazo < LIMITES_PLANTILLA.plazoMin || plazo > LIMITES_PLANTILLA.plazoMax) return null;
    pasos.push({ titulo, plazoDias: plazo });
  }
  return pasos;
}

const P = (titulo: string, plazoDias: number): PasoPlantilla => ({ titulo, plazoDias });

/** Pasos comunes a toda vertical: los que pide la ley laboral chilena al contratar y al despedir. */
const INGRESO_BASE: PasoPlantilla[] = [
  P("Firmar contrato de trabajo", 15),
  P("Registrar el contrato en la Dirección del Trabajo", 15),
  P("Afiliación a AFP, salud y seguro de cesantía", 0),
  P("Entregar el reglamento interno de orden, higiene y seguridad", 0),
];

const SALIDA_BASE: PasoPlantilla[] = [
  P("Enviar carta de aviso de término", 0),
  P("Calcular y firmar el finiquito", 10),
  P("Registrar el término en la Dirección del Trabajo", 10),
];

const POR_VERTICAL: Record<string, { ingreso: PasoPlantilla[]; salida: PasoPlantilla[] }> = {
  seguridad: {
    ingreso: [
      ...INGRESO_BASE,
      P("Verificar curso OS-10 vigente", 0),
      P("Entregar uniforme y credencial", 1),
      P("Asignar PIN de terreno", 1),
    ],
    salida: [
      P("Recibir devolución de uniforme y credencial", 0),
      P("Quitar el PIN de terreno y el acceso a instalaciones", 0),
      ...SALIDA_BASE,
    ],
  },
  aseo: {
    ingreso: [...INGRESO_BASE, P("Entregar uniforme y elementos de protección", 1), P("Asignar PIN de terreno", 1)],
    salida: [P("Recibir devolución de uniforme y elementos de protección", 0), P("Quitar el PIN de terreno", 0), ...SALIDA_BASE],
  },
};

/** Plantilla por vertical cuando la empresa no definió la suya. Una vertical sin plantilla propia usa la base. */
export function pasosProcesoPorVertical(vertical: string, tipo: TipoProcesoPersona): PasoPlantilla[] {
  const v = POR_VERTICAL[vertical];
  if (v) return v[tipo];
  return tipo === "ingreso" ? INGRESO_BASE : SALIDA_BASE;
}

/** Plantilla efectiva: la de la empresa si es válida y no está vacía; si no, la de su vertical. */
export function plantillaEfectiva(
  propia: unknown,
  vertical: string,
  tipo: TipoProcesoPersona,
): PasoPlantilla[] {
  const r = plantillaValida(propia);
  return r?.length ? r : pasosProcesoPorVertical(vertical, tipo);
}

/** Fecha límite del paso (AAAA-MM-DD): la fecha del vínculo más el plazo, en días corridos. */
export function venceDe(fechaBase: string, plazoDias: number): string {
  const d = new Date(`${fechaBase}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + plazoDias);
  return d.toISOString().slice(0, 10);
}

/** La lista se cierra cuando ningún paso queda por hacer (hecho u omitido cuentan como cerrados). */
export const procesoCompleto = (estados: readonly string[]): boolean =>
  estados.length > 0 && estados.every((e) => e !== "por_hacer");

/** ¿Un vínculo nuevo es continuidad de otro (traslado o recontratación al día siguiente)? */
export function esContinuidad(inicio: string, terminosPrevios: readonly (string | null)[]): boolean {
  const ayer = venceDe(inicio, -1);
  return terminosPrevios.some((t) => t !== null && t >= ayer);
}
