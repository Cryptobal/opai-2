import { AwsClient } from "aws4fetch";

import { type Biometria, BiometriaError } from "./tipos";

export type CredencialesRekognition = { accessKeyId: string; secretAccessKey: string; region: string };

/** Confianza mínima (0–100) de Face Liveness para dar la sesión por viva. */
const CONFIANZA_VIDA_MIN = 80;
const PREFIJO_VIDA = "vida:";

/** Falla del proveedor sin respuesta cruda ni credenciales. */
export class ErrorProveedorBiometria extends Error {
  constructor(
    readonly codigo: "credenciales" | "proveedor",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorProveedorBiometria";
  }
}

/**
 * AWS Rekognition por HTTP firmado (SigV4, sin SDK, ADR-008) detrás del contrato `Biometria`. La muestra es el
 * identificador de una sesión de Face Liveness (`vida:<id>`): de ahí salen la prueba de vida y el cuadro de
 * referencia, que se usa y se descarta. Región y credenciales las entrega el almacén cifrado del núcleo.
 */
export function biometriaRekognition(c: CredencialesRekognition, fetchFn: typeof fetch = fetch): Biometria {
  const cliente = new AwsClient({ accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, service: "rekognition", region: c.region, retries: 1 });
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
      throw new ErrorProveedorBiometria("proveedor", "No se pudo contactar al proveedor biométrico.");
    }
    if (r.ok) return (await r.json()) as T;
    const tipo = String(((await r.json().catch(() => ({}))) as { __type?: string }).__type ?? "").split("#").pop() ?? "";
    if (tipo === "ResourceAlreadyExistsException") return {} as T;
    // Borrar lo que ya no existe (rostro o colección) cumple el objetivo: la biometría no está.
    if (borrado && tipo === "ResourceNotFoundException") return {} as T;
    if (["InvalidParameterException", "ImageTooLargeException", "InvalidImageFormatException"].includes(tipo))
      throw new BiometriaError("muestra_invalida", "No se detectó un rostro utilizable en la muestra.");
    if (r.status === 403 || /UnrecognizedClient|InvalidSignature|AccessDenied/.test(tipo))
      throw new ErrorProveedorBiometria("credenciales", "Las credenciales del proveedor biométrico no son válidas.");
    throw new ErrorProveedorBiometria("proveedor", "El proveedor biométrico respondió con un error.");
  }

  /** Resultado de la sesión de vida: viva y cuadro de referencia. La sesión sin éxito no es una persona presente. */
  async function vida(muestra: string): Promise<{ vivo: boolean; imagen: string | null }> {
    if (!muestra.startsWith(PREFIJO_VIDA)) throw new BiometriaError("muestra_invalida", "La muestra no se pudo leer.");
    const r = await llamar<{ Status?: string; Confidence?: number; ReferenceImage?: { Bytes?: string } }>(
      "GetFaceLivenessSessionResults", { SessionId: muestra.slice(PREFIJO_VIDA.length) },
    );
    const vivo = r.Status === "SUCCEEDED" && (r.Confidence ?? 0) >= CONFIANZA_VIDA_MIN;
    return { vivo, imagen: r.ReferenceImage?.Bytes ?? null };
  }

  const coleccionDeArgs = (coleccion: string | undefined): string => {
    if (!coleccion) throw new BiometriaError("muestra_invalida", "Falta la colección de la empresa.");
    return coleccion;
  };

  return {
    nombre: "rekognition",
    disponible: true,
    async iniciarVida() {
      const r = await llamar<{ SessionId: string }>("CreateFaceLivenessSession", {});
      return { sesionId: r.SessionId };
    },
    async enrolar({ sujetoId, muestra, coleccion }) {
      const col = coleccionDeArgs(coleccion);
      const v = await vida(muestra);
      if (!v.vivo || !v.imagen) throw new BiometriaError("sin_prueba_de_vida", "No se pudo comprobar que sea una persona.");
      await llamar("CreateCollection", { CollectionId: col });
      const r = await llamar<{ FaceRecords?: { Face?: { FaceId?: string } }[] }>("IndexFaces", {
        CollectionId: col, Image: { Bytes: v.imagen }, ExternalImageId: sujetoId, MaxFaces: 1, QualityFilter: "AUTO", DetectionAttributes: [],
      });
      const referencia = r.FaceRecords?.[0]?.Face?.FaceId;
      if (!referencia) throw new BiometriaError("muestra_invalida", "El rostro no tiene la calidad suficiente.");
      return { referencia, proveedor: "rekognition" };
    },
    async verificar({ referencia, muestra, coleccion }) {
      const col = coleccionDeArgs(coleccion);
      const v = await vida(muestra);
      if (!v.vivo || !v.imagen) return { coincide: false, vivo: false, puntaje: 0, proveedor: "rekognition" };
      // Rekognition no tiene 1:1 contra una plantilla guardada: se consulta la colección de la empresa y SOLO se
      // acepta el rostro esperado; los demás resultados se descartan sin leerse ni devolverse (ADR-079 punto 3).
      const r = await llamar<{ FaceMatches?: { Similarity?: number; Face?: { FaceId?: string } }[] }>("SearchFacesByImage", {
        CollectionId: col, Image: { Bytes: v.imagen }, FaceMatchThreshold: 50, MaxFaces: 5, QualityFilter: "AUTO",
      });
      const propio = r.FaceMatches?.find((m) => m.Face?.FaceId === referencia);
      return { coincide: propio !== undefined, vivo: true, puntaje: propio?.Similarity ?? 0, proveedor: "rekognition" };
    },
    async borrar(referencia, coleccion) {
      await llamar("DeleteFaces", { CollectionId: coleccionDeArgs(coleccion), FaceIds: [referencia] }, true);
    },
  };
}
