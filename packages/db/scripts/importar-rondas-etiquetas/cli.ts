// Simulación de la migración de etiquetas QR de Rondas desde OPAI 1.0 (Brief 14 · PR 2, decisión de
// Carlos, pregunta 20). SOLO LECTURA Y DRY-RUN: lee un export de checkpoints de 1.0 (JSON) y reporta
// el plan de reutilización (código físico sin firmar; la firma y la opacidad llegan al reemplazar la
// etiqueta, R7). No se conecta a 1.0 ni escribe en ninguna base.
// Uso: pnpm --filter @opai/db importar:rondas-etiquetas --dry-run --origen fixtures:<ruta.json>
import { readFile, writeFile } from "node:fs/promises";

import { leerArgumentos } from "./argumentos";
import { formatearReporte, planearDesdeExport } from "./nucleo";

async function principal(argv: readonly string[]): Promise<number> {
  const r = leerArgumentos(argv);
  if (!r.ok) {
    console.error(r.error);
    return r.codigo;
  }
  const datos: unknown = JSON.parse(await readFile(r.args.fixtures, "utf8"));
  const plan = planearDesdeExport(datos);
  console.log(formatearReporte(plan));
  if (r.args.salida) await writeFile(r.args.salida, JSON.stringify(plan, null, 2), "utf8");
  return 0;
}

principal(process.argv.slice(2))
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((e: unknown) => {
    // Solo el mensaje: los errores propios no llevan valores de las filas.
    console.error(e instanceof Error ? e.message : "Error desconocido");
    process.exitCode = 1;
  });
