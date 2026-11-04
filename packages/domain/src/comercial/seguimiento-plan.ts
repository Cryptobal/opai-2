// Plan de seguimiento comercial (modulos/seguimiento-comercial.md §5, ADR-021): la configuración es un
// dato versionado por tenant que se valida y evalúa aquí; nunca código por tenant. Lógica pura.

export const CANALES_PASO = ["correo", "whatsapp", "llamada", "interno"] as const;
export const EJECUTORES_PASO = ["persona", "opai_automatico", "agente"] as const;
export const DISPARADORES = ["cotizacion_enviada", "entra_a_etapa", "manual"] as const;
export type CanalPaso = (typeof CANALES_PASO)[number];
export type EjecutorPaso = (typeof EJECUTORES_PASO)[number];
export type Disparador = (typeof DISPARADORES)[number];

export type PasoPlan = {
  /** Días (hábiles o corridos según el plan) desde el ancla o desde el paso anterior. */
  dias: number;
  /** HH:mm local del tenant; si falta, la del plan. */
  hora?: string | undefined;
  canal: CanalPaso;
  ejecutor: EjecutorPaso;
  /** Título corto del paso («Seguimiento 1», «Proponer perdido»). */
  titulo: string;
  /** Guion para llamadas o texto base para WhatsApp. */
  guion?: string | undefined;
};

export type ConfigPlan = {
  conteo: "habiles" | "corridos";
  desde: "inicio" | "paso_anterior";
  hora: string;
  ventana: { desde: string; hasta: string };
  /** Al responder el cliente: pausar (se puede reanudar) o detener (termina el seguimiento). */
  alResponder: "pausar" | "detener";
  /** Etapa abierta (id) a la que pasa el negocio cuando el cliente responde; nunca lo baja. */
  etapaAlResponder?: string | undefined;
  /** Al terminar sin respuesta: proponer el cierre (tarea) o solo avisar. */
  alTerminar: "proponer_cierre" | "aplicar_cierre_propuesto" | "solo_avisar";
  /** Etapa abierta (id) desde la cual el plan nunca aplica un cierre solo. */
  noCerrarDesdeEtapa?: string | undefined;
  pasos: PasoPlan[];
};

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_PASOS = 20;

/** Errores de negocio de una configuración de plan (vacío = válida). */
export function validarConfigPlan(c: ConfigPlan): string[] {
  const e: string[] = [];
  for (const [campo, h] of [["hora", c.hora], ["ventana.desde", c.ventana.desde], ["ventana.hasta", c.ventana.hasta]] as const)
    if (!HORA.test(h)) e.push(`La ${campo} debe ser HH:mm.`);
  if (HORA.test(c.ventana.desde) && HORA.test(c.ventana.hasta) && c.ventana.desde >= c.ventana.hasta)
    e.push("La ventana de envío debe terminar después de empezar.");
  if (c.pasos.length < 1 || c.pasos.length > MAX_PASOS) e.push(`Un plan lleva de 1 a ${MAX_PASOS} pasos.`);
  let previo = -1;
  c.pasos.forEach((p, i) => {
    const n = i + 1;
    if (!Number.isInteger(p.dias) || p.dias < 0) e.push(`Paso ${n}: los días deben ser un entero desde 0.`);
    if (c.desde === "inicio" && p.dias < previo) e.push(`Paso ${n}: los días no pueden bajar si se cuentan desde el inicio.`);
    previo = p.dias;
    const hora = p.hora ?? c.hora;
    if (!HORA.test(hora)) e.push(`Paso ${n}: la hora debe ser HH:mm.`);
    else if (p.canal !== "interno" && (hora < c.ventana.desde || hora > c.ventana.hasta))
      e.push(`Paso ${n}: la hora cae fuera de la ventana de envío.`);
    if (p.ejecutor === "opai_automatico" && p.canal !== "correo")
      e.push(`Paso ${n}: «OPAI automático» solo aplica a correo.`);
    if (p.canal === "interno" && p.ejecutor !== "persona")
      e.push(`Paso ${n}: un paso interno lo hace una persona.`);
    if (!p.titulo.trim()) e.push(`Paso ${n}: falta el título.`);
  });
  return e;
}

/**
 * Plan base de una vertical (R1): se copia al tenant al activar Comercial y desde ahí es suyo. La
 * cadencia 3/7/14/15 días hábiles a las 9:00 es la de Gard (seguridad); el resto parte más corta.
 */
export function planBasePorVertical(vertical: string): { nombre: string; config: ConfigPlan } {
  const comun = { conteo: "habiles", desde: "inicio", hora: "09:00", ventana: { desde: "08:00", hasta: "19:00" }, alResponder: "pausar", alTerminar: "proponer_cierre" } as const;
  const seg = vertical === "seguridad";
  const pasos: PasoPlan[] = seg
    ? [
        { dias: 3, canal: "correo", ejecutor: "persona", titulo: "Seguimiento 1" },
        { dias: 7, canal: "whatsapp", ejecutor: "persona", titulo: "Seguimiento 2" },
        { dias: 14, canal: "correo", ejecutor: "persona", titulo: "Seguimiento 3" },
        { dias: 15, canal: "interno", ejecutor: "persona", titulo: "Proponer perdido" },
      ]
    : [
        { dias: 2, canal: "correo", ejecutor: "persona", titulo: "Seguimiento 1" },
        { dias: 5, canal: "llamada", ejecutor: "persona", titulo: "Seguimiento 2" },
        { dias: 10, canal: "interno", ejecutor: "persona", titulo: "Proponer perdido" },
      ];
  return { nombre: "Post-cotización", config: { ...comun, ventana: { ...comun.ventana }, pasos } };
}
