import { describe, expect, it } from "vitest";

import { BiometriaError, biometriaRekognition, coleccionDe, ErrorProveedorBiometria } from "./index";

const cred = { accessKeyId: "AKIAEJEMPLO", secretAccessKey: "secreto", region: "sa-east-1" };
const VIDA_OK = { Status: "SUCCEEDED", Confidence: 97, ReferenceImage: { Bytes: "AQI=" } };

function falso(respuestas: Record<string, { status?: number; cuerpo: unknown }>) {
  const llamadas: { objetivo: string; cuerpo: Record<string, unknown>; auth: string | null }[] = [];
  const f = (async (req: Request) => {
    const objetivo = (req.headers.get("x-amz-target") ?? "").replace("RekognitionService.", "");
    llamadas.push({ objetivo, cuerpo: JSON.parse(await req.text()), auth: req.headers.get("authorization") });
    const r = respuestas[objetivo] ?? { cuerpo: {} };
    return new Response(JSON.stringify(r.cuerpo), { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
  return { f, llamadas };
}

describe("Rekognition detrás del contrato Biometria", () => {
  it("enrola desde una sesión de vida, en la colección de la empresa, firmando con SigV4", async () => {
    const { f, llamadas } = falso({ GetFaceLivenessSessionResults: { cuerpo: VIDA_OK }, IndexFaces: { cuerpo: { FaceRecords: [{ Face: { FaceId: "f-1" } }] } } });
    const r = await biometriaRekognition(cred, f).enrolar({ sujetoId: "p-1", muestra: "vida:s-1", coleccion: coleccionDe("t-1") });
    expect(r).toEqual({ referencia: "f-1", proveedor: "rekognition" });
    const idx = llamadas.find((l) => l.objetivo === "IndexFaces");
    expect(idx?.auth).toMatch(/Credential=AKIAEJEMPLO\/\d+\/sa-east-1\/rekognition/);
    expect(idx?.cuerpo).toMatchObject({ CollectionId: "opai-t-1", ExternalImageId: "p-1" });
  });

  it("una sesión sin vida no enrola ni verifica", async () => {
    const { f } = falso({ GetFaceLivenessSessionResults: { cuerpo: { Status: "FAILED", Confidence: 99 } } });
    const b = biometriaRekognition(cred, f);
    await expect(b.enrolar({ sujetoId: "p", muestra: "vida:s", coleccion: "c" })).rejects.toMatchObject({ motivo: "sin_prueba_de_vida" });
    expect(await b.verificar({ referencia: "f", muestra: "vida:s", coleccion: "c" })).toMatchObject({ coincide: false, vivo: false });
  });

  it("verifica 1:1: ignora a otras personas de la colección y devuelve el puntaje del rostro esperado", async () => {
    const respuesta = (id: string) =>
      falso({ GetFaceLivenessSessionResults: { cuerpo: VIDA_OK }, SearchFacesByImage: { cuerpo: { FaceMatches: [{ Similarity: 99.9, Face: { FaceId: "otra" } }, { Similarity: 96, Face: { FaceId: id } }] } } });
    const propio = await biometriaRekognition(cred, respuesta("mia").f).verificar({ referencia: "mia", muestra: "vida:s", coleccion: "c" });
    expect(propio).toMatchObject({ coincide: true, vivo: true, puntaje: 96 });
    const ajeno = await biometriaRekognition(cred, respuesta("x").f).verificar({ referencia: "mia", muestra: "vida:s", coleccion: "c" });
    expect(ajeno).toMatchObject({ coincide: false, puntaje: 0 });
  });

  it("borrar lo que ya no existe es éxito y los errores no filtran la respuesta cruda", async () => {
    const nada = falso({ DeleteFaces: { status: 400, cuerpo: { __type: "ResourceNotFoundException" } } });
    await expect(biometriaRekognition(cred, nada.f).borrar("f", "c")).resolves.toBeUndefined();
    const mal = falso({ DeleteFaces: { status: 500, cuerpo: { message: "detalle AKIAEJEMPLO" } } });
    const e = await biometriaRekognition(cred, mal.f).borrar("f", "c").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorProveedorBiometria);
    expect((e as Error).message).not.toMatch(/AKIA|detalle/);
    await expect(biometriaRekognition(cred, nada.f).enrolar({ sujetoId: "p", muestra: "rostro:x", coleccion: "c" })).rejects.toBeInstanceOf(BiometriaError);
  });
});
