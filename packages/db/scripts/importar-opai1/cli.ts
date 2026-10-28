// Simulación de la importación comercial desde OPAI 1.0 (Brief 07). Solo lectura.
// Uso: DATABASE_URL=<rol opai_app> pnpm --filter @opai/db importar:opai1 --dry-run --tenant <slug> \
//        --origen fixtures:<ruta.json> [--salida <reporte.json>]
// Lee el estado 2.0 con `enTransaccion` (RLS del tenant). Sin `--dry-run` se niega.
import "dotenv/config";

import { writeFile } from "node:fs/promises";

import { cerrarClientes } from "../../src/index";
import { leerEstadoDestino } from "./destino";
import { ejecutar } from "./ejecutar";
import { lectorApiOpai1, lectorFixtures } from "./origen";

ejecutar(process.argv.slice(2), {
  lector: (o) => (o.tipo === "fixtures" ? lectorFixtures(o.ruta) : lectorApiOpai1()),
  estadoDestino: leerEstadoDestino,
  escribir: (ruta, contenido) => writeFile(ruta, contenido, "utf8"),
  log: (t) => console.log(t),
  error: (t) => console.error(t),
})
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((e: unknown) => {
    // Solo el mensaje: los errores propios no llevan valores de las filas.
    console.error(e instanceof Error ? e.message : "Error desconocido");
    process.exitCode = 1;
  })
  .finally(() => cerrarClientes());
