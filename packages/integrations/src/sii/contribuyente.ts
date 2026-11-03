// Consulta de contribuyente al SII por RUT (CAR-162, PR 2). Interfaz neutral: el proveedor real es
// SimpleAPI RUT (`rut.simpleapi.cl/v2`, suscripción distinta de la emisión DTE); sin credencial, el
// proveedor «no configurado» lo dice. Nunca lanza: siempre devuelve un resultado tipado.

export type ActividadSii = { codigo: string; descripcion: string; afectaIva: boolean };

export type DatosContribuyente = {
  rut: string;
  razonSocial: string;
  actividades: readonly ActividadSii[];
  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;
  correoIntercambio: string | null;
  inicioActividades: string | null;
};

export type ResultadoContribuyente =
  | { estado: "ok"; datos: DatosContribuyente }
  | { estado: "sin_inicio"; datos: DatosContribuyente }
  | { estado: "no_encontrado"; mensaje: string }
  | { estado: "sin_respuesta"; mensaje: string }
  | { estado: "no_configurado"; mensaje: string };

export interface ConsultaContribuyente {
  readonly nombre: string;
  readonly disponible: boolean;
  consultar(rut: string): Promise<ResultadoContribuyente>;
}

export const MENSAJE_NO_CONFIGURADO =
  "La consulta al SII no está configurada: falta la API key de SimpleAPI RUT en Configuración › Integraciones.";

export function contribuyenteNoConfigurado(): ConsultaContribuyente {
  return {
    nombre: "no_configurado",
    disponible: false,
    consultar: async () => ({ estado: "no_configurado", mensaje: MENSAJE_NO_CONFIGURADO }),
  };
}

/** Doble para tests y desarrollo: responde con un mapa fijo de RUT → resultado. */
export function contribuyenteSimulado(
  respuestas: Readonly<Record<string, ResultadoContribuyente>>,
): ConsultaContribuyente & { llamadas: string[] } {
  const llamadas: string[] = [];
  return {
    nombre: "simulado",
    disponible: true,
    llamadas,
    async consultar(rut) {
      llamadas.push(rut);
      return (
        respuestas[rut] ?? {
          estado: "no_encontrado",
          mensaje: `No hay registros del RUT ${rut} en el SII.`,
        }
      );
    },
  };
}
