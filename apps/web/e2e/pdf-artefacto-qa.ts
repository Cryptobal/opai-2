import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Solo para PDF sintéticos cuya procedencia QA haya verificado el llamador.
 * No prueba la pertenencia del usuario ni del documento al tenant; NO conectar
 * automáticamente a los e2e remotos sin esa comprobación independiente.
 * Guarda bytes ya obtenidos, nunca consulta el servidor ni captura credenciales.
 */
export async function guardarPdfFixtureQa(
  bytes: Uint8Array,
  carpeta: string,
  nombre: "cpq-base-ficticia" | "cpq-secciones-ficticias",
): Promise<string> {
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-") {
    throw new Error("El artefacto QA no contiene un PDF");
  }
  await mkdir(carpeta, { recursive: true });
  const ruta = join(carpeta, `${nombre}.pdf`);
  await writeFile(ruta, bytes);
  return ruta;
}
