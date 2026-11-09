import { z } from "zod";

import {
  type EntradaContexto,
  MAX_TEXTO_SECCION,
  SISTEMA_SUGERENCIA,
  type TipoContexto,
  construirPromptSugerencia,
  contextoParaGenerar,
  separarSugerencia,
} from "@opai/domain";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { externo } from "../externo";
import { uuidSchema } from "../core/esquemas";
import { iaDe } from "../integraciones/ia";
import { PERMISO_MANAGE, negocioDe } from "./comun";

const MAX_NOTAS = 20;

const fuenteSchema = z.object({
  id: z.string(),
  fuente: externo(z.string()),
  fechaFuente: z.string(),
  estado: z.enum(["confirmado", "inferido"]),
});

const salidaSchema = z.object({
  /** false si el tenant no tiene IA configurada: la edición a mano sigue disponible. */
  disponible: z.boolean(),
  /** Borrador de IA: texto de terceros, nunca un acuerdo ni una cifra. Una persona lo acepta o lo descarta. */
  borrador: externo(z.string()).nullable(),
  fuentes: z.array(fuenteSchema),
  faltantes: z.array(externo(z.string())),
  aviso: z.string().nullable(),
});

const SIN_CONTEXTO = "No hay notas de contexto para este negocio: registra lo conversado con el cliente para poder sugerir.";

export const contextoSugerirSeccion = defineCapability({
  // Cada nota que alimentó la sugerencia queda auditada por su ID, sin copiar su contenido.
  auditarLectura: (s) => s.fuentes.map((f) => f.id),
  id: "comercial.contexto.sugerir_seccion",
  descripcion:
    "Sugiere un borrador de una sección de la propuesta a partir del contexto comercial del negocio, con IA. Devuelve el borrador, las notas usadas (confirmadas o inferidas) y los datos que faltaron. No guarda nada ni toca lo escrito a mano; no usa montos ni dotación, que vienen del CPQ.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    negocioId: uuidSchema,
    seccion: z.string().trim().min(2).max(120),
    instruccion: z.string().trim().max(500).optional(),
    textoActual: z.string().max(MAX_TEXTO_SECCION).optional(),
    incluirInferido: z.boolean().default(true),
  }),
  output: salidaSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const negocio = await negocioDe(ctx, input.negocioId);
    const filas = await ctx.db.negocioContexto.findMany({
      where: { negocioId: negocio.id, archivadoEn: null },
      orderBy: [{ fechaFuente: "desc" }, { createdAt: "desc" }],
      take: 50,
    });
    const entrada = (f: (typeof filas)[number]): EntradaContexto => ({
      tipo: f.tipo as TipoContexto,
      resumen: f.resumen,
      fuente: f.fuente,
      fechaFuente: f.fechaFuente.toISOString().slice(0, 10),
      estado: f.estado as "confirmado" | "inferido",
    });
    const usadas = filas
      .filter((f) => contextoParaGenerar([entrada(f)], { incluirInferido: input.incluirInferido }).length === 1)
      .slice(0, MAX_NOTAS);
    const lineas = contextoParaGenerar(usadas.map(entrada), { incluirInferido: input.incluirInferido, maxEntradas: MAX_NOTAS });
    const fuentes = usadas.map((f) => ({ id: f.id, fuente: f.fuente, fechaFuente: entrada(f).fechaFuente, estado: entrada(f).estado }));
    if (lineas.length === 0) return { disponible: true, borrador: null, fuentes: [], faltantes: [SIN_CONTEXTO], aviso: null };

    const ia = await iaDe(ctx, "estandar", "comercial");
    if (!ia) return { disponible: false, borrador: null, fuentes: [], faltantes: [], aviso: "La IA no está configurada. Puedes seguir editando a mano." };
    let texto: string;
    try {
      texto = (await ia.completar({ sistema: SISTEMA_SUGERENCIA, prompt: construirPromptSugerencia({ seccion: input.seccion, instruccion: input.instruccion, textoActual: input.textoActual, lineasContexto: lineas }), maxTokens: 1200 })).texto;
    } catch {
      // El detalle del proveedor no sale al usuario; el consumo ya se midió en el adaptador.
      throw reglaDeNegocio("No pudimos generar la sugerencia ahora. Puedes reintentar o seguir editando a mano.");
    }
    const { borrador, faltantes } = separarSugerencia(texto);
    return { disponible: true, borrador: borrador === "" ? null : borrador, fuentes, faltantes, aviso: null };
  },
});
