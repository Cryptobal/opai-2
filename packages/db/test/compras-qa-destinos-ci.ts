// El servicio dedicado del job test-db es la única fuente admitida.
const PUERTO = "55432";
const PLANTILLA = "opai_e2e_compras_template";
const PREFIJO = "opai_e2e_compras_";

export function destinosComprasQa(origen: string, nombre: string) {
  let plantilla: URL;
  try {
    plantilla = new URL(origen);
  } catch {
    throw new Error("La suite de compras requiere su servicio de CI dedicado.");
  }
  if (
    !["postgres:", "postgresql:"].includes(plantilla.protocol) ||
    plantilla.hostname !== "127.0.0.1" ||
    plantilla.port !== PUERTO ||
    plantilla.username !== "postgres" ||
    !/^compras-[0-9]+-[0-9]+$/.test(plantilla.password) ||
    plantilla.pathname !== `/${PLANTILLA}` ||
    plantilla.search ||
    plantilla.hash ||
    plantilla.href.includes("?") ||
    plantilla.href.includes("#") ||
    !/^opai_e2e_compras_[0-9a-f]{32}$/.test(nombre)
  ) {
    throw new Error("La suite de compras requiere su servicio de CI dedicado.");
  }
  const catalogo = new URL(plantilla);
  catalogo.pathname = "/postgres";
  const caso = new URL(plantilla);
  caso.pathname = `/${nombre}`;
  return { catalogo: catalogo.toString(), caso: caso.toString(), plantilla: PLANTILLA };
}

export function nombreComprasQa(uuid: string) {
  return PREFIJO + uuid.replaceAll("-", "");
}
