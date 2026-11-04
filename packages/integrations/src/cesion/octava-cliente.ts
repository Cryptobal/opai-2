// Cliente tipado de los endpoints de Octava que usa OPAI (ObtenerToken, CargaXmlCesion, CedeDte, ConsultaEstadoAEC).
import type {
  CargaXmlCesionRequest,
  CargaXmlCesionResponse,
  CedeDteRequest,
  CedeDteResponse,
  ConsultaEstadoAecRequest,
  ConsultaEstadoAecResponse,
  ObtenerTokenRequest,
  ObtenerTokenResponse,
} from "./octava-api";
import { postOctava, type OpcionesOctava } from "./octava-http";

export function clienteOctava(op: OpcionesOctava = {}) {
  return {
    obtenerToken: (b: ObtenerTokenRequest) =>
      postOctava<ObtenerTokenRequest, ObtenerTokenResponse>("ObtenerToken", b, op),
    cargaXmlCesion: (b: CargaXmlCesionRequest) =>
      postOctava<CargaXmlCesionRequest, CargaXmlCesionResponse>("CargaXmlCesion", b, op),
    cedeDte: (b: CedeDteRequest) => postOctava<CedeDteRequest, CedeDteResponse>("CedeDte", b, op),
    consultaEstadoAec: (b: ConsultaEstadoAecRequest) =>
      postOctava<ConsultaEstadoAecRequest, ConsultaEstadoAecResponse>("ConsultaEstadoAEC", b, op),
  };
}

export type ClienteOctava = ReturnType<typeof clienteOctava>;
