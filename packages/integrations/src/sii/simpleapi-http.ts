import { encabezadoAuthSimpleApi } from "./simpleapi-contrato";

export type ParteMultipart = { nombre: string; valor: string | Blob; nombreArchivo?: string };

export async function postMultipartSimpleApi(
  url: string,
  apiKey: string,
  partes: readonly ParteMultipart[],
): Promise<Response> {
  const form = new FormData();
  for (const p of partes) {
    if (typeof p.valor === "string") {
      form.append(p.nombre, p.valor);
    } else {
      form.append(p.nombre, p.valor, p.nombreArchivo ?? "archivo.bin");
    }
  }
  return fetch(url, {
    method: "POST",
    headers: { Authorization: encabezadoAuthSimpleApi(apiKey) },
    body: form,
  });
}

export function blobBase64(base64: string, tipo: string): Blob {
  return new Blob([Buffer.from(base64, "base64")], { type: tipo });
}

export function blobTexto(texto: string, tipo: string): Blob {
  return new Blob([texto], { type: tipo });
}

export async function leerJsonRespuesta<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const cuerpo = await res.text().catch(() => "");
    throw new Error(`SimpleAPI HTTP ${res.status}${cuerpo ? `: ${cuerpo.slice(0, 200)}` : ""}`);
  }
  return (await res.json()) as T;
}
