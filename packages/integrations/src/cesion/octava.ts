// Adaptador de cesión App Octava (CAR-154): flujo portado de OPAI 1.0 (`octava-cesion.ts`).
// Registro del cedente → token → CargaXmlCesion → CedeDte; el estado lo consulta el trabajo horario.
import type { OctavaRespuestaBase } from "./octava-api";
import { clienteOctava } from "./octava-cliente";
import { operacionOctavaId, estadoDesdeCodigo, leerOperacionOctavaId } from "./octava-estado";
import type { FetchOctava } from "./octava-http";
import {
  ambienteOctava,
  asegurarToken,
  formatoRutOctava,
  limitarTexto,
  type AlmacenSesionOctava,
  type CedenteOctava,
  type CredencialesOctava,
  type DepsSesion,
} from "./octava-sesion";
import type { AdaptadorCesion, PayloadCesion } from "./tipos";

export type DepsAdaptadorOctava = {
  /** null = el tenant no configuró la integración: el adaptador queda no disponible. */
  integrador: CredencialesOctava | null;
  cedente: CedenteOctava;
  almacen: AlmacenSesionOctava;
  ambiente: "certificacion" | "produccion";
  fetch?: FetchOctava;
  baseUrl?: string;
  ahora?: () => number;
};

function exigir<T>(valor: T | undefined, mensaje: string): T {
  if (valor === undefined || valor === null || valor === "") throw new Error(`Octava: ${mensaje}`);
  return valor;
}

const TOKEN_VENCIDO = new Set(["TEXP", "TINV"]);

export function adaptadorOctava(deps: DepsAdaptadorOctava): AdaptadorCesion {
  const { integrador, cedente, ambiente } = deps;
  const amb = ambienteOctava(ambiente);
  const cliente = clienteOctava({
    ...(deps.fetch ? { fetch: deps.fetch } : {}),
    ...(deps.baseUrl ? { baseUrl: deps.baseUrl } : {}),
  });
  const sesion = (): DepsSesion => ({
    cliente,
    integrador: exigir(integrador ?? undefined, "no configurado."),
    cedente,
    almacen: deps.almacen,
    ahora: deps.ahora ?? Date.now,
  });

  /** Ejecuta con token vigente; si Octava lo da por vencido (TEXP/TINV), renueva y reintenta una vez. */
  async function conToken<R extends OctavaRespuestaBase>(llamar: (token: string) => Promise<R>): Promise<R> {
    const s = sesion();
    const r = await llamar(await asegurarToken(s));
    if (!TOKEN_VENCIDO.has(r.DescripcionResultado ?? "")) return r;
    await deps.almacen.guardarToken(null);
    return llamar(await asegurarToken(s, true));
  }

  return {
    nombre: "octava",
    disponible: Boolean(integrador?.usuario && integrador.clave),
    async enviar(p: PayloadCesion) {
      const tipoDte = exigir(p.tipoDte, "falta el tipo de DTE a ceder.");
      const rutEmisor = formatoRutOctava(p.rutEmisor);
      const emailDeudor = exigir(p.emailDeudor?.trim(), "falta el correo del deudor (receptor del DTE).");
      const factorEmail = exigir(p.factorEmail?.trim(), "falta el correo del factor (cesionario).");
      const vence = exigir(p.fechaVencimiento, "falta la fecha de vencimiento del documento.");
      exigir(cedente.email.trim(), "falta el correo del cedente (Configuración → Integraciones → Cesión DTE).");
      const xml = Buffer.from(p.xmlBase64, "base64").toString("utf8");

      const carga = await conToken((t) => cliente.cargaXmlCesion({ STRINGXML: xml, AMBIENTE: amb, TOKEN: t }));
      if (carga.IdResultadoFE !== "0" && carga.IdResultadoFE !== "5") {
        throw new Error(`Octava CargaXmlCesion falló (${carga.IdResultadoFE ?? carga.DescripcionResultado}): ${carga.ResultadoFE ?? ""}`);
      }
      const cede = await conToken((t) =>
        cliente.cedeDte({
          FOLIO: String(p.folio),
          TIPODTE: String(tipoDte),
          RUTEMISOR: rutEmisor,
          AMBIENTE: amb,
          DIRECCIONCEDENTE: limitarTexto(cedente.direccion, 70, "Sin direccion"),
          EMAILCEDENTE: limitarTexto(cedente.email, 40, ""),
          RUTCESIONARIO: formatoRutOctava(p.factorRut),
          RAZONSOCIALCESIONARIO: limitarTexto(p.factorNombre, 100, p.factorRut),
          DIRECCIONCESIONARIO: limitarTexto(p.factorDireccion, 70, "Sin direccion"),
          EMAILCESIONARIO: limitarTexto(factorEmail, 40, ""),
          NOMBRECONTACTO: limitarTexto(cedente.contactoNombre, 40, "Contacto"),
          EMAILCONTACTO: limitarTexto(cedente.contactoEmail, 40, ""),
          MONTOCEDER: String(Math.round(p.montoTotal)),
          FECHAVENCIMIENTO: vence,
          // El deudor es el receptor del DTE; mandar el correo del factor suele dar RSC en el RPETC.
          EMAILDEUDOR: limitarTexto(emailDeudor, 40, ""),
          TOKEN: t,
        }),
      );
      // 0 = cedido ahora; 3 = ya estaba cedido (reintento): igual se sigue por ConsultaEstadoAEC.
      if (cede.IdResultadoFE !== "0" && cede.IdResultadoFE !== "3") {
        throw new Error(`Octava CedeDte falló (${cede.IdResultadoFE ?? cede.DescripcionResultado}): ${cede.ResultadoFE ?? ""}`);
      }
      return {
        operacionExternaId: operacionOctavaId({ ambiente: amb, rutEmisor, tipoDte, folio: p.folio }),
        estado: "enviada",
      };
    },
    async consultar(operacionExternaId) {
      const k = leerOperacionOctavaId(operacionExternaId);
      if (!k) throw new Error(`Octava: identificador de operación no reconocido (${operacionExternaId}).`);
      const r = await conToken((t) =>
        cliente.consultaEstadoAec({
          FOLIO: String(k.folio),
          TIPODTE: String(k.tipoDte),
          RUTEMISOR: k.rutEmisor,
          AMBIENTE: k.ambiente,
          TOKEN: t,
        }),
      );
      return estadoDesdeCodigo(r.CodigoCesion, r.ResultadoFE);
    },
  };
}
