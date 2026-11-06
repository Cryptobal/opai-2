import { createHash, randomUUID } from "node:crypto";

import {
  ErrorBiometria,
  type ImagenRostro,
  type OpcionesVidaSimulada,
  type ProveedorBiometria,
  type ResultadoRostro,
  type ResultadoVida,
} from "./tipos";

const huella = (b: ImagenRostro): string => createHash("sha256").update(b).digest("hex");

/**
 * Proveedor simulado (pruebas, CI y empresas de prueba): el «rostro» es la huella de los bytes de la
 * imagen, así que la misma imagen coincide y otra no. No hace ninguna llamada externa.
 */
export class BiometriaSimulada implements ProveedorBiometria {
  readonly nombre = "simulado" as const;
  private readonly colecciones = new Map<string, Map<string, { externalId: string; huella: string }>>();
  private readonly vidas = new Map<string, ResultadoVida>();
  /** Próximo resultado de vida; por defecto, viva con la imagen que se programe. */
  private siguienteVida: ResultadoVida | null = null;

  /** Solo pruebas: lo que devolverá la próxima sesión de vida. */
  programarVida(imagen: ImagenRostro | null, viva = true, confianza = 0.99): void {
    this.siguienteVida = { viva, confianza, imagen };
  }

  /** Solo pruebas: cuántos rostros guarda una colección (0 si no existe). */
  rostros(coleccionId: string): number {
    return this.colecciones.get(coleccionId)?.size ?? 0;
  }

  tieneColeccion(coleccionId: string): boolean {
    return this.colecciones.has(coleccionId);
  }

  async asegurarColeccion(coleccionId: string): Promise<void> {
    if (!this.colecciones.has(coleccionId)) this.colecciones.set(coleccionId, new Map());
  }

  async eliminarColeccion(coleccionId: string): Promise<void> {
    this.colecciones.delete(coleccionId);
  }

  async iniciarVida(opciones?: OpcionesVidaSimulada): Promise<{ sesionId: string }> {
    const sesionId = `sim-${randomUUID()}`;
    const sim = opciones?.simulacion;
    const porOpciones: ResultadoVida | null = sim
      ? { viva: sim.viva, confianza: sim.viva ? 0.99 : 0.2, imagen: new TextEncoder().encode(`rostro:${sim.rostro}`) }
      : null;
    this.vidas.set(sesionId, this.siguienteVida ?? porOpciones ?? { viva: true, confianza: 0.99, imagen: new TextEncoder().encode("rostro:prueba") });
    this.siguienteVida = null;
    return { sesionId };
  }

  async resultadoVida(sesionId: string): Promise<ResultadoVida> {
    const r = this.vidas.get(sesionId);
    if (!r) throw new ErrorBiometria("proveedor", "La sesión de prueba de vida no existe.");
    return r;
  }

  async enrolar(coleccionId: string, externalId: string, imagen: ImagenRostro): Promise<{ rostroId: string }> {
    const col = this.colecciones.get(coleccionId);
    if (!col) throw new ErrorBiometria("proveedor", "La colección no existe.");
    if (imagen.length === 0) throw new ErrorBiometria("sin_rostro", "No se detectó un rostro.");
    const rostroId = `rostro-${randomUUID()}`;
    col.set(rostroId, { externalId, huella: huella(imagen) });
    return { rostroId };
  }

  async verificar(coleccionId: string, rostroEsperado: string, imagen: ImagenRostro, umbral: number): Promise<ResultadoRostro> {
    const col = this.colecciones.get(coleccionId);
    if (!col) throw new ErrorBiometria("proveedor", "La colección no existe.");
    if (imagen.length === 0) throw new ErrorBiometria("sin_rostro", "No se detectó un rostro.");
    const esperado = col.get(rostroEsperado);
    const similitud = esperado && esperado.huella === huella(imagen) ? 0.99 : 0;
    return { coincide: similitud >= umbral, similitud };
  }

  async eliminarRostro(coleccionId: string, rostroId: string): Promise<void> {
    this.colecciones.get(coleccionId)?.delete(rostroId);
  }
}
