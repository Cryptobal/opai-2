import { aplicarModulosNuevosRegistrados } from "@opai/capabilities";

import { asegurarRegistro } from "./registro";

/** El cron horario: anota el catálogo y activa los módulos nuevos en las empresas que lo pidieron. */
export async function activarModulosNuevosDelCron(): Promise<number> {
  asegurarRegistro();
  return (await aplicarModulosNuevosRegistrados()).activados;
}
