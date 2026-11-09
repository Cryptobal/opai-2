export type ModoLista = "solo_autorizados" | "permitir_fuera_de_lista";

export type EntradaLista = {
  tipo: "autorizada" | "bloqueada";
  /** Documento o patente normalizado (`DocumentoNormalizado.clave` o `normalizarPatente`). */
  clave: string;
  /** Tipos de registro a los que aplica; vacío = todos. */
  tiposRegistro: readonly string[];
  vigenteDesde: Date | null;
  vigenteHasta: Date | null;
  /** Días permitidos, 0 = domingo … 6 = sábado, en la zona de la instalación; vacío = todos. */
  dias: readonly number[];
  /** Horario en minutos desde medianoche; ambos nulos = todo el día. */
  desdeMin: number | null;
  hastaMin: number | null;
  usoUnico: boolean;
  /** Una entrada de uso único ya consumida (R8). */
  consumida: boolean;
};

export type MotivoDenegado =
  "bloqueado" | "fuera_de_lista" | "fuera_de_horario" | "uso_unico_consumido";
export type DecisionAcceso =
  { resultado: "permitido"; motivo: null } | { resultado: "denegado"; motivo: MotivoDenegado };

/** Día de la semana y minuto del día de un instante en la zona de la instalación. */
export function momentoLocal(ahora: Date, zona: string): { dia: number; minutos: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { dia, minutos: Number(get("hour")) * 60 + Number(get("minute")) };
}

const aplica = (e: EntradaLista, clave: string, tipoRegistro: string) =>
  e.clave === clave && (e.tiposRegistro.length === 0 || e.tiposRegistro.includes(tipoRegistro));

function enVentana(e: EntradaLista, ahora: Date, zona: string): boolean {
  if (e.vigenteDesde && ahora < e.vigenteDesde) return false;
  if (e.vigenteHasta && ahora > e.vigenteHasta) return false;
  const { dia, minutos } = momentoLocal(ahora, zona);
  if (e.dias.length > 0 && !e.dias.includes(dia)) return false;
  if (e.desdeMin !== null && minutos < e.desdeMin) return false;
  if (e.hastaMin !== null && minutos > e.hastaMin) return false;
  return true;
}

/**
 * Cruce con las listas (R6–R10). El caller entrega solo las entradas del alcance que aplican a la instalación
 * (empresa, cuenta, instalación, grupo). Bloqueado gana a autorizado en cualquier alcance (R7); en modo
 * «solo autorizados» quien no tiene una entrada vigente no entra; una entrada fuera de su horario cuenta como
 * no autorizado; la de uso único se consume al primer ingreso (R8).
 */
export function decidirAcceso(p: {
  clave: string;
  tipoRegistro: string;
  modo: ModoLista;
  entradas: readonly EntradaLista[];
  ahora: Date;
  zona: string;
}): DecisionAcceso {
  const propias = p.entradas.filter((e) => aplica(e, p.clave, p.tipoRegistro));
  if (propias.some((e) => e.tipo === "bloqueada" && enVentana(e, p.ahora, p.zona))) {
    return { resultado: "denegado", motivo: "bloqueado" };
  }
  if (p.modo === "permitir_fuera_de_lista") return { resultado: "permitido", motivo: null };
  const autorizadas = propias.filter((e) => e.tipo === "autorizada");
  if (autorizadas.length === 0) return { resultado: "denegado", motivo: "fuera_de_lista" };
  const vigentes = autorizadas.filter((e) => enVentana(e, p.ahora, p.zona));
  if (vigentes.length === 0) return { resultado: "denegado", motivo: "fuera_de_horario" };
  if (vigentes.every((e) => e.usoUnico && e.consumida)) {
    return { resultado: "denegado", motivo: "uso_unico_consumido" };
  }
  return { resultado: "permitido", motivo: null };
}
