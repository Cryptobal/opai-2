import {
  BiometriaSimulada,
  biometriaRekognition,
  coleccionDe,
  ErrorBiometria,
  type ImagenRostro,
  type OpcionesVidaSimulada,
  type ProveedorBiometria,
} from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { consumoBase } from "./consumo-base";
import { integracionDe } from "./resolver";
import { leerSecreto } from "./secretos";

/** Proveedor simulado compartido del proceso: pruebas, CI y empresas de prueba. Sin llamadas externas. */
const simulado = new BiometriaSimulada();
export const biometriaSimuladaDelProceso = (): BiometriaSimulada => simulado;

async function proveedorDe(ctx: Contexto): Promise<{ p: ProveedorBiometria; propio: boolean } | null> {
  const fila = await integracionDe(ctx, "biometria");
  const proveedor = (fila?.config as { proveedor?: string } | null)?.proveedor ?? "simulado";
  // El simulado acepta cualquier rostro de prueba: solo existe en empresas de prueba (slug `qa-…`), nunca en una real.
  if (proveedor === "simulado") {
    const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } });
    return t?.slug.startsWith("qa-") ? { p: simulado, propio: false } : null;
  }
  if (!fila || proveedor !== "rekognition") return null;
  const [accessKeyId, secretAccessKey, region] = await Promise.all(
    ["access_key_id", "secret_access_key", "region"].map((n) => leerSecreto(ctx, fila.id, n)),
  );
  if (!accessKeyId || !secretAccessKey || !region) return null;
  return { p: biometriaRekognition({ accessKeyId, secretAccessKey, region }), propio: true };
}

const MENSAJES = {
  sin_rostro: "No se detectó un rostro utilizable. Acércate a la cámara con buena luz.",
  calidad: "El rostro no tiene la calidad suficiente. Mejora la luz y vuelve a intentar.",
  credenciales: "La biometría no está bien configurada en esta empresa.",
  proveedor: "El servicio de biometría no respondió. Usa tu PIN.",
} as const;

/**
 * Biometría de la empresa (ADR-027, ADR-031): una colección por empresa, credenciales del almacén
 * cifrado y cada llamada medida en `core.consumos`. null si la empresa no la tiene configurada.
 */
export async function biometriaDe(ctx: Contexto, modulo = "asistencia") {
  const r = await proveedorDe(ctx);
  if (!r) return null;
  const coleccion = coleccionDe(ctx.tenantId);
  // El proveedor ya cobró antes de medir: se registra siempre (yaIncurrido); BYOK no se cobra.
  const medir = (recurso: string, unidad: string) =>
    ctx.medidor
      .registrar({ ...consumoBase(ctx, modulo), recurso, unidad, cantidad: 1, sinCosto: r.propio, yaIncurrido: true })
      .catch(() => undefined);
  const conMensaje = async <T>(recurso: string, unidad: string, llamada: () => Promise<T>): Promise<T> => {
    try {
      const v = await llamada();
      await medir(recurso, unidad);
      return v;
    } catch (e) {
      if (e instanceof ErrorBiometria) {
        if (e.codigo !== "credenciales") await medir(recurso, unidad);
        throw Object.assign(reglaDeNegocio(MENSAJES[e.codigo]), { codigoBiometria: e.codigo });
      }
      throw e;
    }
  };
  return {
    nombre: r.p.nombre,
    coleccion,
    asegurarColeccion: () => r.p.asegurarColeccion(coleccion),
    eliminarColeccion: () => r.p.eliminarColeccion(coleccion),
    iniciarVida: (opciones?: OpcionesVidaSimulada) => conMensaje("biometria.vida", "sesion", () => r.p.iniciarVida(opciones)),
    resultadoVida: (sesionId: string) => r.p.resultadoVida(sesionId),
    enrolar: (personaId: string, imagen: ImagenRostro) =>
      conMensaje("biometria.enrolamiento", "imagen", async () => {
        await r.p.asegurarColeccion(coleccion);
        return r.p.enrolar(coleccion, personaId, imagen);
      }),
    verificar: (rostroEsperado: string, imagen: ImagenRostro, umbral: number) =>
      conMensaje("biometria.verificacion", "imagen", () => r.p.verificar(coleccion, rostroEsperado, imagen, umbral)),
    eliminarRostro: (rostroId: string) => r.p.eliminarRostro(coleccion, rostroId),
  };
}
