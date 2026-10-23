// IA por HTTP, sin SDKs (ADR-031): Anthropic, OpenAI y Google. Los módulos nunca eligen modelo:
// piden una clase de tarea (económica, estándar, potente) y el núcleo resuelve proveedor y modelo.

export type ClaseTarea = "economica" | "estandar" | "potente";
export const CLASES_TAREA: readonly ClaseTarea[] = ["economica", "estandar", "potente"];
export type ProveedorIaId = "ia_anthropic" | "ia_openai" | "ia_google";

export type SolicitudIa = { sistema?: string; prompt: string; maxTokens?: number };
export type RespuestaIa = {
  texto: string;
  tokensEntrada: number;
  tokensSalida: number;
  modelo: string;
  proveedor: ProveedorIaId;
};

export interface ProveedorIa {
  readonly id: ProveedorIaId;
  completar(modelo: string, s: SolicitudIa): Promise<RespuestaIa>;
}

/** Modelos por clase cuando el tenant no configura otros (ajuste de plataforma `ia.modelos`). */
export const MODELOS_POR_DEFECTO: Readonly<
  Partial<Record<ProveedorIaId, Record<ClaseTarea, string>>>
> = {
  ia_anthropic: {
    economica: "claude-haiku-5-5",
    estandar: "claude-sonnet-5-5",
    potente: "claude-opus-5-5",
  },
};

async function cuerpo<T>(r: Response, proveedor: string): Promise<T> {
  if (!r.ok) throw new Error(`${proveedor} respondió ${r.status}.`);
  return (await r.json()) as T;
}

export function anthropic(apiKey: string): ProveedorIa {
  return {
    id: "ia_anthropic",
    async completar(modelo, s) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: modelo,
          max_tokens: s.maxTokens ?? 1024,
          ...(s.sistema ? { system: s.sistema } : {}),
          messages: [{ role: "user", content: s.prompt }],
        }),
      });
      type R = {
        content: { type: string; text?: string }[];
        usage: { input_tokens: number; output_tokens: number };
      };
      const d = await cuerpo<R>(r, "Anthropic");
      return {
        texto: d.content.map((c) => c.text ?? "").join(""),
        tokensEntrada: d.usage.input_tokens,
        tokensSalida: d.usage.output_tokens,
        modelo,
        proveedor: "ia_anthropic",
      };
    },
  };
}

export function openai(apiKey: string): ProveedorIa {
  return {
    id: "ia_openai",
    async completar(modelo, s) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: modelo,
          max_completion_tokens: s.maxTokens ?? 1024,
          messages: [
            ...(s.sistema ? [{ role: "system", content: s.sistema }] : []),
            { role: "user", content: s.prompt },
          ],
        }),
      });
      type R = {
        choices: { message: { content: string | null } }[];
        usage: { prompt_tokens: number; completion_tokens: number };
      };
      const d = await cuerpo<R>(r, "OpenAI");
      return {
        texto: d.choices[0]?.message.content ?? "",
        tokensEntrada: d.usage.prompt_tokens,
        tokensSalida: d.usage.completion_tokens,
        modelo,
        proveedor: "ia_openai",
      };
    },
  };
}

export function google(apiKey: string): ProveedorIa {
  return {
    id: "ia_google",
    async completar(modelo, s) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          ...(s.sistema ? { systemInstruction: { parts: [{ text: s.sistema }] } } : {}),
          contents: [{ role: "user", parts: [{ text: s.prompt }] }],
          generationConfig: { maxOutputTokens: s.maxTokens ?? 1024 },
        }),
      });
      type R = {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      const d = await cuerpo<R>(r, "Google");
      return {
        texto: (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join(""),
        tokensEntrada: d.usageMetadata?.promptTokenCount ?? 0,
        tokensSalida: d.usageMetadata?.candidatesTokenCount ?? 0,
        modelo,
        proveedor: "ia_google",
      };
    },
  };
}

export function proveedorIa(id: ProveedorIaId, apiKey: string): ProveedorIa {
  return id === "ia_anthropic"
    ? anthropic(apiKey)
    : id === "ia_openai"
      ? openai(apiKey)
      : google(apiKey);
}
