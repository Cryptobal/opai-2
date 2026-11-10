/** Entrada de changelog publicada en el repositorio (global; el estado de lectura es por usuario). */
export type EntradaNovedad = {
  id: string;
  fecha: string;
  modulo: string;
  titulo: string;
  descripcion: string;
  ruta: string | null;
  destacada: boolean;
  car: string | null;
  permiso: string | null;
  imagen: string | null;
};

export type FrontmatterNovedad = {
  id: string;
  fecha: string;
  modulo: string;
  titulo: string;
  destacada?: boolean;
  car?: string;
  permiso?: string;
  ruta?: string;
  imagen?: string;
};

const CLAVES = new Set([
  "id",
  "fecha",
  "modulo",
  "titulo",
  "destacada",
  "car",
  "permiso",
  "ruta",
  "imagen",
]);

/** Interpreta un valor YAML simple (booleano, texto o fecha). */
function valorDe(raw: string): string | boolean {
  const t = raw.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

/** Separa frontmatter y cuerpo de un archivo Markdown de novedad. */
export function parsearNovedadMarkdown(texto: string): EntradaNovedad {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const cuerpo = m?.[2];
  const bloque = m?.[1];
  if (!bloque || cuerpo === undefined) throw new Error("Falta frontmatter delimitado por ---");
  const fm: Record<string, string | boolean> = {};
  for (const linea of bloque.split("\n")) {
    const sep = linea.indexOf(":");
    if (sep < 0) continue;
    const clave = linea.slice(0, sep).trim();
    if (!CLAVES.has(clave)) continue;
    fm[clave] = valorDe(linea.slice(sep + 1));
  }
  const id = String(fm.id ?? "").trim();
  const fecha = String(fm.fecha ?? "").trim();
  const modulo = String(fm.modulo ?? "").trim();
  const titulo = String(fm.titulo ?? "").trim();
  if (!id || !fecha || !modulo || !titulo) {
    throw new Error("Frontmatter incompleto: id, fecha, modulo y titulo son obligatorios");
  }
  const descripcion = cuerpo.trim();
  if (!descripcion) throw new Error(`La novedad ${id} no tiene descripción`);
  return {
    id,
    fecha,
    modulo,
    titulo,
    descripcion,
    ruta: fm.ruta ? String(fm.ruta) : null,
    destacada: fm.destacada === true,
    car: fm.car ? String(fm.car) : null,
    permiso: fm.permiso ? String(fm.permiso) : null,
    imagen: fm.imagen ? String(fm.imagen) : null,
  };
}
