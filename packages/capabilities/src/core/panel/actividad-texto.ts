// Frases de la actividad de una ficha a partir de la auditoría (capacidad + input saneado).

const SUSTANTIVO: Record<string, string> = {
  cuentas: "la cuenta",
  contactos: "el contacto",
  instalaciones: "la instalación",
  puestos: "el puesto",
  personas: "la ficha de",
  vinculos: "el vínculo laboral",
  cargos: "el cargo",
  estructuras: "una estructura de sueldo",
  documentos: "el documento",
};

const VERBO: Record<string, string> = {
  create: "creó",
  update: "actualizó",
  archive: "archivó",
  set_estado: "cambió el estado de",
  set_activo: "cambió la vigencia de",
  set_representantes: "actualizó los representantes de",
  bloquear: "bloqueó",
  desbloquear: "desbloqueó",
  terminar: "terminó",
  anular: "anuló",
  confirmar_subida: "subió",
  iniciar_subida: "empezó a subir",
  vincular: "vinculó",
  desvincular: "desvinculó",
  vincular_usuario: "vinculó un usuario a",
};

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
  return t(input.nombre) ?? (persona || null) ?? t(input.titulo) ?? null;
}

/** "creó la cuenta Logística Andina", "cambió el estado de la cuenta a Cliente activo". */
export function frase(capability: string, input: Input): string {
  const [, entidad = "", verbo = ""] = capability.split(".");
  const v = VERBO[verbo] ?? verbo.replace(/_/g, " ");
  const s = SUSTANTIVO[entidad] ?? entidad;
  const o = objeto(input);
  const estado = typeof input.estado === "string" ? ` a ${input.estado.replace(/_/g, " ")}` : "";
  return `${v} ${s}${o ? ` ${o}` : ""}${verbo === "set_estado" ? estado : ""}`;
}

/** Campos cambiados (sin ids ni claves técnicas), hasta 4. */
export function cambios(input: Input): { campo: string; valor: string }[] {
  return Object.entries(input)
    .filter(([k, v]) => ETIQUETA[k] && v !== undefined && v !== null && typeof v !== "object")
    .slice(0, 4)
    .map(([k, v]) => ({ campo: ETIQUETA[k] as string, valor: String(v) }));
}
