import forge from "node-forge";

/** Tope razonable para un .pfx/.p12 de firma (bytes decodificados). */
export const CERTIFICADO_PFX_MAX_BYTES = 256 * 1024;

export type MetaCertificadoPfx = {
  titular: string;
  /** RUN/RUT en formato legible, sin enmascarar (solo servidor; persistir enmascarado). */
  rutTitular: string | null;
  /** Fecha de vencimiento ISO (YYYY-MM-DD, zona UTC del certificado). */
  venceEn: string;
};

function rutDeSubject(cert: forge.pki.Certificate): string | null {
  for (const attr of cert.subject.attributes) {
    const nombre = attr.shortName ?? attr.name;
    if (nombre === "serialNumber" || attr.type === "2.5.4.5") {
      const v = String(attr.value ?? "").trim();
      if (v.length >= 3) return v;
    }
  }
  const cn = cert.subject.getField("CN")?.value;
  if (typeof cn === "string") {
    const m = cn.match(/(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])$/);
    if (m?.[1]) return m[1];
  }
  return null;
}

function titularDeSubject(cert: forge.pki.Certificate): string {
  const cn = cert.subject.getField("CN")?.value;
  if (typeof cn === "string" && cn.trim()) {
    return cn.replace(/\s+\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\s*$/, "").trim() || cn.trim();
  }
  const attrs = cert.subject.attributes.map((a) => String(a.value ?? "")).filter(Boolean);
  return attrs[0]?.trim() || "Titular del certificado";
}

/** Valida extensión/clave y extrae metadatos no secretos. Devuelve el base64 normalizado a guardar cifrado. */
export function validarCertificadoPfx(
  archivoBase64: string,
  clave: string,
): { base64: string; meta: MetaCertificadoPfx } {
  let bin: Buffer;
  try {
    bin = Buffer.from(archivoBase64.replace(/\s/g, ""), "base64");
  } catch {
    throw new Error("El archivo no es un certificado .pfx o .p12 válido.");
  }
  if (bin.length === 0) {
    throw new Error("El archivo no es un certificado .pfx o .p12 válido.");
  }
  if (bin.length > CERTIFICADO_PFX_MAX_BYTES) {
    throw new Error(
      `El certificado supera ${CERTIFICADO_PFX_MAX_BYTES / 1024} KB. Usa un archivo más pequeño.`,
    );
  }
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(bin.toString("binary")));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, clave);
  } catch {
    throw new Error("La clave del certificado no coincide con el archivo.");
  }
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const oidCert = forge.pki.oids.certBag;
  const certs = oidCert ? certBags[oidCert] : undefined;
  const cert = certs?.[0]?.cert;
  if (!cert) {
    throw new Error("El archivo no contiene un certificado digital válido.");
  }
  const vence = cert.validity.notAfter;
  return {
    base64: bin.toString("base64"),
    meta: {
      titular: titularDeSubject(cert),
      rutTitular: rutDeSubject(cert),
      venceEn: vence.toISOString().slice(0, 10),
    },
  };
}
