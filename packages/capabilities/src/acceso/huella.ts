import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

import { type EntradaHuella, huellaDocumento } from "@opai/domain";

import { reglaDeNegocio } from "../errores";

const SECRETO_MIN_BYTES = 32;
const KID = /^[a-z0-9]{1,16}$/;

export type HuellaVersionada = { kid: string; huella: string };

/**
 * Clave de plataforma para las huellas de documento de Control de acceso (CAR-78 E4b). La entrega un
 * responsable autorizado por un canal seguro (variables del entorno del despliegue); nunca está en el código,
 * en git, en un PR ni en los logs. Falla cerrado: sin clave, o con menos de 32 bytes, no se calcula ninguna
 * huella y por lo tanto no se registra ni se cruza ningún documento. No pasa por el catálogo de integraciones
 * del tenant (no es una credencial de tenant), igual que la firma de etiquetas QR de Rondas.
 */
function clave(
  secreto: string | undefined,
  kid: string,
  nombre: string,
  uso: "huella" | "invitacion" = "huella",
): Buffer {
  if (!secreto || Buffer.byteLength(secreto, "utf8") < SECRETO_MIN_BYTES) {
    throw reglaDeNegocio(
      `${nombre} no está configurada o tiene menos de 32 bytes: no se registran ni cruzan documentos en este entorno.`,
    );
  }
  if (!KID.test(kid)) throw reglaDeNegocio(`La versión de ${nombre} no es válida.`);
  // Separación de dominio por versión: rotar de v1 a v2 deriva otra clave, nunca se firma con el secreto base.
  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(secreto, "utf8"),
      new Uint8Array(0),
      `opai/acceso/${uso}/${kid}`,
      32,
    ),
  );
}

/** Huella con la clave vigente y su versión (se guarda junto a la huella para poder rotar). */
export function huellaVigente(e: EntradaHuella): HuellaVersionada {
  const kid = process.env["ACCESO_HUELLA_KID"] ?? "v1";
  return {
    kid,
    huella: huellaDocumento(
      e,
      clave(process.env["ACCESO_HUELLA_SECRET"], kid, "ACCESO_HUELLA_SECRET"),
    ),
  };
}

/**
 * Huellas con las que puede existir hoy un documento: la vigente y, durante una rotación, la anterior
 * (`ACCESO_HUELLA_SECRET_ANTERIOR` + `ACCESO_HUELLA_KID_ANTERIOR`). Para cruzar listas y duplicados se
 * busca por cualquiera de ellas; las filas nuevas se escriben siempre con la vigente.
 */
export function huellasCandidatas(e: EntradaHuella): HuellaVersionada[] {
  const lista = [huellaVigente(e)];
  const anterior = process.env["ACCESO_HUELLA_SECRET_ANTERIOR"];
  if (anterior) {
    const kid = process.env["ACCESO_HUELLA_KID_ANTERIOR"] ?? "";
    if (kid === lista[0]?.kid)
      throw reglaDeNegocio("La versión anterior de la clave de huellas repite la vigente.");
    lista.push({
      kid,
      huella: huellaDocumento(e, clave(anterior, kid, "ACCESO_HUELLA_SECRET_ANTERIOR")),
    });
  }
  return lista;
}

/** Firma HMAC del QR de un visitante para un día, con la clave de invitación de la versión `kid`. */
function firmaInvitacion(secreto: string | undefined, kid: string, msg: string): string {
  const k = clave(secreto, kid, "ACCESO_HUELLA_SECRET", "invitacion");
  return createHmac("sha256", k).update(msg).digest("base64url").slice(0, 22);
}
/**
 * Código del QR de invitación de un visitante para un día (CAR-478, R14): `A1.<kid>.<visitante>.<día>.<firma>`.
 * No se guarda en la base: es una firma HMAC (clave derivada de ACCESO_HUELLA_SECRET con otro dominio) del
 * tenant, el visitante y el día, así que se puede volver a mostrar y la portería la verifica sin buscar un secreto.
 */
export function codigoInvitacion(tenantId: string, visitanteId: string, dia: string): string {
  const kid = process.env["ACCESO_HUELLA_KID"] ?? "v1";
  const f = firmaInvitacion(
    process.env["ACCESO_HUELLA_SECRET"],
    kid,
    `${tenantId}.${visitanteId}.${dia}`,
  );
  return `A1.${kid}.${visitanteId}.${dia}.${f}`;
}

const CODIGO = /^A1\.([a-z0-9]{1,16})\.([0-9a-f-]{36})\.(\d{4}-\d{2}-\d{2})\.([A-Za-z0-9_-]{22})$/;

/**
 * Verifica un QR leído en la portería (CAR-478): devuelve visitante y día si la firma es de esta empresa con la
 * clave vigente o, durante una rotación, la anterior; si no, `null`. La comparación es de tiempo constante.
 */
export function verificarInvitacion(
  tenantId: string,
  codigo: string,
): { visitanteId: string; dia: string } | null {
  const m = CODIGO.exec(codigo.trim());
  if (!m) return null;
  const [, kid = "", visitanteId = "", dia = "", firma = ""] = m;
  const vigente = process.env["ACCESO_HUELLA_KID"] ?? "v1";
  const secreto =
    kid === vigente
      ? process.env["ACCESO_HUELLA_SECRET"]
      : kid === process.env["ACCESO_HUELLA_KID_ANTERIOR"]
        ? process.env["ACCESO_HUELLA_SECRET_ANTERIOR"]
        : undefined;
  if (!secreto) return null;
  const esperada = Buffer.from(firmaInvitacion(secreto, kid, `${tenantId}.${visitanteId}.${dia}`));
  const leida = Buffer.from(firma);
  return esperada.length === leida.length && timingSafeEqual(esperada, leida)
    ? { visitanteId, dia }
    : null;
}
