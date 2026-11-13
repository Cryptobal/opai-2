import { listarCapacidades, obtenerCapacidad } from "../../registry";
import { SUSTANTIVO } from "./actividad-sustantivos";
import { MODULO, VERBO } from "./actividad-verbos";

// Frases de la actividad de una ficha a partir de la auditoría (capacidad + input saneado).

const ETIQUETA: Record<string, string> = {
  nombre: "Nombre",
  nombres: "Nombres",
  apellidos: "Apellidos",
  rut: "RUT",
  telefono: "Teléfono",
  email: "Correo",
  emailPersonal: "Correo personal",
  emailLaboral: "Correo laboral",
  estado: "Estado",
  cargo: "Cargo",
  giro: "Giro",
  calle: "Dirección",
  comuna: "Comuna",
  motivo: "Motivo",
  dotacion: "Dotación",
  horaInicio: "Inicio",
  horaFin: "Término",
  sueldoBase: "Sueldo base",
  vigenteDesde: "Vigente desde",
  venceEn: "Vencimiento",
  termino: "Término",
};

type Input = Record<string, unknown>;

/** Nombre del objeto afectado (nombre, nombres y apellidos, título o archivo), si viene. */
function objeto(input: Input): string | null {
  const t = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const persona = [t(input.nombres), t(input.apellidos)].filter(Boolean).join(" ");
  return (
    t(input.nombre) ??
    (persona || null) ??
    t(input.titulo) ??
    t(input.empresa) ??
    t(input.email) ??
    null
  );
}

/**
 * "creó la cuenta Logística Andina", "cambió el estado de la cuenta a Cliente activo". Sin verbo
 * conocido nombra la ficha («modificó la cotización»); sin ficha conocida, el módulo («aprobó un
 * registro de Finanzas»). Un id histórico o nuevo jamás se presenta como texto al usuario (CAR-339).
 */
export function frase(capability: string, input: Input): string {
  const partes = capability.split(".");
  const verbo = partes.at(-1) ?? "";
  const entidad = partes.at(-2) ?? "";
  if (capability === "platform.modules.set" || verbo === "set_modules")
    return "cambió los módulos activos";
  if (obtenerCapacidad(capability)?.efecto === "lectura") return "consultó información";
  const v = VERBO[verbo];
  const s = SUSTANTIVO[entidad];
  const modulo = partes.length > 2 ? MODULO[partes[0] ?? ""] : undefined;
  const o = objeto(input);
  if (verbo === "invite") return `invitó a ${o ?? "un usuario"}`;
  if (v && s) return `${v} ${s}${o ? ` ${o}` : ""}`;
  if (s) return `modificó ${s}${o ? ` ${o}` : ""}`;
  if (v && modulo) return `${v} un registro de ${modulo}`;
  return modulo ? `realizó un cambio en ${modulo}` : "realizó un cambio";
}

/** Campos cambiados (sin ids ni claves técnicas), hasta 4. */
export function cambios(input: Input): { campo: string; valor: string }[] {
  return Object.entries(input)
    .filter(([k, v]) => ETIQUETA[k] && v !== undefined && v !== null && typeof v !== "object")
    .slice(0, 4)
    .map(([k, v]) => ({ campo: ETIQUETA[k] as string, valor: String(v) }));
}

/** Cambios conocidos por el registro; las lecturas se excluyen antes de paginar, sin más SQL. */
export function capacidadesDeCambios(prefijo = ""): string[] {
  return listarCapacidades()
    .filter((c) => c.efecto !== "lectura" && c.id.startsWith(prefijo))
    .map((c) => c.id);
}
