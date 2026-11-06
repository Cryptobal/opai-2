import { AwsClient } from "aws4fetch";

import {
  ErrorBiometria,
  type ImagenRostro,
  type ProveedorBiometria,
  type ResultadoRostro,
  type ResultadoVida,
} from "./tipos";

export type CredencialesRekognition = { accessKeyId: string; secretAccessKey: string; region: string };

/** Confianza mínima (0–100) de Face Liveness para dar la sesión por viva. */
const CONFIANZA_VIDA_MIN = 80;

const b64 = (b: ImagenRostro): string => Buffer.from(b).toString("base64");

/**
 * AWS Rekognition por HTTP firmado (SigV4, sin SDK, ADR-008). Región y credenciales las entrega el
 * almacén cifrado del núcleo. Los mensajes de error son genéricos: no incluyen la respuesta cruda.
 */
export function biometriaRekognition(c: CredencialesRekognition, fetchFn: typeof fetch = fetch): ProveedorBiometria {
  const cliente = new AwsClient({
    accessKeyId: c.accessKeyId,
    secretAccessKey: c.secretAccessKey,
    service: "rekognition",
    region: c.region,
    retries: 1,
  });
  const url = `https://rekognition.${c.region}.amazonaws.com/`;

  async function llamar<T>(operacion: string, cuerpo: Record<string, unknown>, borrado = false): Promise<T> {
    let r: Response;
    try {
      const firmada = await cliente.sign(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": `RekognitionService.${operacion}` },
        body: JSON.stringify(cuerpo),
      });
      r = await fetchFn(firmada);
    } catch {
      throw new ErrorBiometria("proveedor", "No se pudo contactar al proveedor biométrico.");
    }
    if (r.ok) return (await r.json()) as T;
    const tipo = String(((await r.json().catch(() => ({}))) as { __type?: string }).__type ?? "").split("#").pop() ?? "";
    if (tipo === "ResourceAlreadyExistsException") return {} as T;
    // Borrar lo que ya no existe (colección o rostro) cumple el objetivo: la biometría no está.
    if (borrado && tipo === "ResourceNotFoundException") return {} as T;
    if (tipo === "InvalidParameterException" || tipo === "ImageTooLargeException" || tipo === "InvalidImageFormatException")
      throw new ErrorBiometria("sin_rostro", "No se detectó un rostro utilizable en la imagen.");
    if (r.status === 400 && /UnrecognizedClient|InvalidSignature|AccessDenied/.test(tipo))
      throw new ErrorBiometria("credenciales", "Las credenciales del proveedor biométrico no son válidas.");
    if (r.status === 403) throw new ErrorBiometria("credenciales", "Las credenciales del proveedor biométrico no son válidas.");
    throw new ErrorBiometria("proveedor", "El proveedor biométrico respondió con un error.");
  }

  return {
    nombre: "rekognition",
    async asegurarColeccion(coleccionId) {
      await llamar("CreateCollection", { CollectionId: coleccionId });
    },
    async eliminarColeccion(coleccionId) {
      await llamar("DeleteCollection", { CollectionId: coleccionId }, true);
    },
    async iniciarVida(_opciones) {
      const r = await llamar<{ SessionId: string }>("CreateFaceLivenessSession", {});
      return { sesionId: r.SessionId };
    },
    async resultadoVida(sesionId): Promise<ResultadoVida> {
      const r = await llamar<{ Status?: string; Confidence?: number; ReferenceImage?: { Bytes?: string } }>(
        "GetFaceLivenessSessionResults",
        { SessionId: sesionId },
      );
      const confianza = (r.Confidence ?? 0) / 100;
      return {
        viva: r.Status === "SUCCEEDED" && (r.Confidence ?? 0) >= CONFIANZA_VIDA_MIN,
        confianza,
        imagen: r.ReferenceImage?.Bytes ? new Uint8Array(Buffer.from(r.ReferenceImage.Bytes, "base64")) : null,
      };
    },
    async enrolar(coleccionId, externalId, imagen) {
      const r = await llamar<{ FaceRecords?: { Face?: { FaceId?: string } }[] }>("IndexFaces", {
        CollectionId: coleccionId,
        Image: { Bytes: b64(imagen) },
        ExternalImageId: externalId,
        MaxFaces: 1,
        QualityFilter: "AUTO",
        DetectionAttributes: [],
      });
      const rostroId = r.FaceRecords?.[0]?.Face?.FaceId;
      if (!rostroId) throw new ErrorBiometria("calidad", "El rostro no tiene la calidad suficiente para enrolarse.");
      return { rostroId };
    },
    async verificar(coleccionId, rostroEsperado, imagen, umbral): Promise<ResultadoRostro> {
      // Rekognition no tiene verificación 1:1 contra una plantilla guardada: se consulta la colección de la
      // empresa y SOLO se acepta el rostro esperado. Los demás resultados se descartan sin leerse.
      const r = await llamar<{ FaceMatches?: { Similarity?: number; Face?: { FaceId?: string } }[] }>(
        "SearchFacesByImage",
        { CollectionId: coleccionId, Image: { Bytes: b64(imagen) }, FaceMatchThreshold: umbral * 100, MaxFaces: 5, QualityFilter: "AUTO" },
      );
      const propio = r.FaceMatches?.find((m) => m.Face?.FaceId === rostroEsperado);
      const similitud = (propio?.Similarity ?? 0) / 100;
      return { coincide: propio !== undefined && similitud >= umbral, similitud };
    },
    async eliminarRostro(coleccionId, rostroId) {
      await llamar("DeleteFaces", { CollectionId: coleccionId, FaceIds: [rostroId] }, true);
    },
  };
}
