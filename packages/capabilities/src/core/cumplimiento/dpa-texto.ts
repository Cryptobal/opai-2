import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { ajuste } from "../config";
import { leerDpaVigente, versionVigenteDpa } from "./dpa";

const dpaTextoSchema = z.object({
  versionVigente: z.string().describe('Versión vigente; "" si OPAI aún no publica ninguna.'),
  publicada: z.boolean(),
  /** Texto íntegro de la versión vigente; null si no hay versión o el texto está vacío (sin error). */
  texto: z.string().nullable(),
  /** Huella SHA-256 del texto, idéntica a la de documento_ref al aceptar; null si no hay texto. */
  sha256: z.string().nullable(),
});

export const cumplimientoDpaTexto = defineCapability({
  id: "core.cumplimiento.dpa_texto",
  descripcion:
    "Texto íntegro de la versión vigente del acuerdo de tratamiento de datos (DPA) que publica OPAI, con su huella SHA-256, para que el owner lea exactamente lo que va a aceptar (Ley 21.719). Si aún no hay texto publicado, lo indica sin error.",
  permiso: PERMISOS_CORE.cumplimientoRead,
  input: z.object({}),
  output: dpaTextoSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const version = await versionVigenteDpa(ctx);
    if (!version) return { versionVigente: "", publicada: false, texto: null, sha256: null };
    const texto = (await ajuste<string>(ctx, "core", "cumplimiento_dpa_texto", ctx.db)) || "";
    // Texto vacío: se informa explícitamente (texto/sha256 null), no es un error (§16.1).
    if (!texto.trim()) return { versionVigente: version, publicada: true, texto: null, sha256: null };
    // Reutiliza leerDpaVigente: el mismo cálculo del hash que se guarda en documento_ref al aceptar,
    // así el hash de la lectura y el del comprobante de aceptación coinciden siempre.
    const vigente = await leerDpaVigente(ctx, ctx.db, undefined);
    return { versionVigente: vigente.version, publicada: true, texto: vigente.texto, sha256: vigente.sha256 };
  },
});
