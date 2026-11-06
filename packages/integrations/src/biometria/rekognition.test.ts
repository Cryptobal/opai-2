import { describe, expect, it } from "vitest";

import { biometriaRekognition } from "./rekognition";
import { BiometriaSimulada } from "./simulado";
import { ErrorBiometria, coleccionDe } from "./tipos";

const cred = { accessKeyId: "AKIAEJEMPLO", secretAccessKey: "secreto", region: "sa-east-1" };

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

describe("Rekognition (HTTP firmado)", () => {
  it("firma con SigV4 en la región de la empresa y usa la colección de la empresa", async () => {
    const { f, llamadas } = falso({ IndexFaces: { cuerpo: { FaceRecords: [{ Face: { FaceId: "f-1" } }] } } });
    const p = biometriaRekognition(cred, f);
    const r = await p.enrolar(coleccionDe("t-1"), "persona-1", new Uint8Array([1, 2]));
    expect(r.rostroId).toBe("f-1");
    expect(llamadas[0]?.auth).toMatch(/Credential=AKIAEJEMPLO\/\d+\/sa-east-1\/rekognition/);
    expect(llamadas[0]?.cuerpo["CollectionId"]).toBe("opai-t-1");
    expect(llamadas[0]?.cuerpo["ExternalImageId"]).toBe("persona-1");
  });

  it("verifica 1:1: ignora a otras personas de la colección y exige el umbral", async () => {
    const respuesta = (sim: number, id: string) =>
      falso({ SearchFacesByImage: { cuerpo: { FaceMatches: [{ Similarity: 99.9, Face: { FaceId: "otra" } }, { Similarity: sim, Face: { FaceId: id } }] } } });
    const img = new Uint8Array([9]);
    const ok = respuesta(97, "mia");
    expect(await biometriaRekognition(cred, ok.f).verificar("c", "mia", img, 0.9)).toEqual({ coincide: true, similitud: 0.97 });
    const bajo = respuesta(80, "mia");
    expect((await biometriaRekognition(cred, bajo.f).verificar("c", "mia", img, 0.9)).coincide).toBe(false);
    const solo = respuesta(99, "otra-distinta");
    expect(await biometriaRekognition(cred, solo.f).verificar("c", "mia", img, 0.9)).toEqual({ coincide: false, similitud: 0 });
  });

  it("la prueba de vida exige estado SUCCEEDED y confianza suficiente", async () => {
    const mk = (Status: string, Confidence: number) =>
      biometriaRekognition(cred, falso({ GetFaceLivenessSessionResults: { cuerpo: { Status, Confidence, ReferenceImage: { Bytes: "AQI=" } } } }).f);
    expect((await mk("SUCCEEDED", 95).resultadoVida("s")).viva).toBe(true);
    expect((await mk("SUCCEEDED", 50).resultadoVida("s")).viva).toBe(false);
    expect((await mk("FAILED", 99).resultadoVida("s")).viva).toBe(false);
  });

  it("la colección que ya existe no es un error y los errores no filtran la respuesta cruda", async () => {
    const { f } = falso({ CreateCollection: { status: 400, cuerpo: { __type: "ResourceAlreadyExistsException" } } });
    await expect(biometriaRekognition(cred, f).asegurarColeccion("c")).resolves.toBeUndefined();
    const mal = falso({ SearchFacesByImage: { status: 500, cuerpo: { message: "detalle interno AKIAEJEMPLO" } } });
    const e = await biometriaRekognition(cred, mal.f).verificar("c", "x", new Uint8Array([1]), 0.9).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorBiometria);
    expect((e as Error).message).not.toMatch(/AKIA|detalle/);
  });
});

describe("proveedor simulado", () => {
  it("la misma imagen coincide, otra no, y otra empresa no encuentra el rostro", async () => {
    const p = new BiometriaSimulada();
    await p.asegurarColeccion("a");
    await p.asegurarColeccion("b");
    const { rostroId } = await p.enrolar("a", "p1", new Uint8Array([1, 2, 3]));
    expect((await p.verificar("a", rostroId, new Uint8Array([1, 2, 3]), 0.9)).coincide).toBe(true);
    expect((await p.verificar("a", rostroId, new Uint8Array([9]), 0.9)).coincide).toBe(false);
    expect((await p.verificar("b", rostroId, new Uint8Array([1, 2, 3]), 0.9)).coincide).toBe(false);
    await p.eliminarRostro("a", rostroId);
    expect(p.rostros("a")).toBe(0);
  });
});
