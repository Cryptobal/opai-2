import forge from "node-forge";

import { rutTitularCertificado } from "./simpleapi-formatos";

/** Tope razonable para un .pfx/.p12 de firma (bytes decodificados). */
export const CERTIFICADO_PFX_MAX_BYTES = 256 * 1024;

export const MSG_CERTIFICADO_VENCIDO = "El certificado digital está vencido.";
export const MSG_CERTIFICADO_NO_VIGENTE = "El certificado digital aún no es vigente.";
export const MSG_SIN_LLAVE_PRIVADA = "El archivo no contiene una llave privada.";
export const MSG_CLAVE_NO_COINCIDE = "La clave del certificado no coincide con el archivo.";
export const MSG_LLAVE_NO_CORRESPONDE = "La llave privada no corresponde al certificado.";

export type MetaCertificadoPfx = {
  titular: string;
  /** RUN/RUT en formato legible, sin enmascarar (solo servidor; persistir enmascarado). */
  rutTitular: string | null;
  /** Fecha de vencimiento ISO (YYYY-MM-DD, zona UTC del certificado). */
  venceEn: string;
};

/** RUT del titular como `extractRut` de OPAI 1.0: del serialNumber y, si no lo trae, del CN (CAR-240). */
function rutDeSubject(cert: forge.pki.Certificate): string | null {
  for (const attr of cert.subject.attributes) {
    const nombre = attr.shortName ?? attr.name;
    if (nombre === "serialNumber" || attr.type === "2.5.4.5") {
      const rut = rutTitularCertificado(String(attr.value ?? ""));
      if (rut) return rut;
    }
  }
  const cn = cert.subject.getField("CN")?.value;
  return typeof cn === "string" ? rutTitularCertificado(cn) : null;
}

function titularDeSubject(cert: forge.pki.Certificate): string {
  const cn = cert.subject.getField("CN")?.value;
  if (typeof cn === "string" && cn.trim()) {
    return cn.replace(/\s+\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\s*$/, "").trim() || cn.trim();
  }
  const attrs = cert.subject.attributes.map((a) => String(a.value ?? "")).filter(Boolean);
  return attrs[0]?.trim() || "Titular del certificado";
}

function llavesRsaCoinciden(
  cert: forge.pki.Certificate,
  privateKey: forge.pki.PrivateKey,
): boolean {
  const pub = cert.publicKey as forge.pki.rsa.PublicKey;
  const priv = privateKey as forge.pki.rsa.PrivateKey;
  if (!pub?.n || !priv?.n || !pub?.e || !priv?.e) return false;
  return pub.n.equals(priv.n) && pub.e.equals(priv.e);
}

function llavePrivadaDeP12(p12: forge.pkcs12.Pkcs12Pfx): forge.pki.PrivateKey | null {
  const shrouded = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const oidShrouded = forge.pki.oids.pkcs8ShroudedKeyBag;
  const shroudedBags = oidShrouded ? shrouded[oidShrouded] : undefined;
  const deShrouded = shroudedBags?.find((b) => b.key)?.key;
  if (deShrouded) return deShrouded;

  const plain = p12.getBags({ bagType: forge.pki.oids.keyBag });
  const oidPlain = forge.pki.oids.keyBag;
  const plainBags = oidPlain ? plain[oidPlain] : undefined;
  return plainBags?.find((b) => b.key)?.key ?? null;
}

function certificadosDeP12(p12: forge.pkcs12.Pkcs12Pfx): forge.pki.Certificate[] {
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const oidCert = forge.pki.oids.certBag;
  const bags = oidCert ? certBags[oidCert] : undefined;
  return (bags ?? []).map((b) => b.cert).filter((c): c is forge.pki.Certificate => Boolean(c));
}

function localKeyIdDeBag(bag: forge.pkcs12.Bag): string | null {
  const attrs = bag.attributes;
  if (!attrs?.localKeyId) return null;
  const raw = attrs.localKeyId;
  const buf = Array.isArray(raw) ? raw[0] : raw;
  if (!buf) return null;
  return forge.util.bytesToHex(buf as string);
}

function certificadoParaLlave(
  p12: forge.pkcs12.Pkcs12Pfx,
  privateKey: forge.pki.PrivateKey,
): forge.pki.Certificate {
  const certs = certificadosDeP12(p12);
  if (certs.length === 0) {
    throw new Error("El archivo no contiene un certificado digital válido.");
  }

  const keyBags = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag!
    ] ?? []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag!] ?? []),
  ];
  const keyLocalId = keyBags.map(localKeyIdDeBag).find(Boolean) ?? null;

  if (keyLocalId) {
    const certBagsRaw = p12.getBags({ bagType: forge.pki.oids.certBag })[
      forge.pki.oids.certBag!
    ];
    for (const bag of certBagsRaw ?? []) {
      if (bag.cert && localKeyIdDeBag(bag) === keyLocalId) {
        if (llavesRsaCoinciden(bag.cert, privateKey)) return bag.cert;
      }
    }
  }

  for (const cert of certs) {
    if (llavesRsaCoinciden(cert, privateKey)) return cert;
  }

  throw new Error(MSG_LLAVE_NO_CORRESPONDE);
}

function exigirVigencia(cert: forge.pki.Certificate, ahora = new Date()): void {
  if (cert.validity.notAfter < ahora) throw new Error(MSG_CERTIFICADO_VENCIDO);
  if (cert.validity.notBefore > ahora) throw new Error(MSG_CERTIFICADO_NO_VIGENTE);
}

/** Valida extensión/clave y extrae metadatos no secretos. Devuelve el base64 normalizado a guardar cifrado. */
export function validarCertificadoPfx(
  archivoBase64: string,
  clave: string,
  ahora = new Date(),
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
    throw new Error(MSG_CLAVE_NO_COINCIDE);
  }

  const privateKey = llavePrivadaDeP12(p12);
  if (!privateKey) throw new Error(MSG_SIN_LLAVE_PRIVADA);

  const cert = certificadoParaLlave(p12, privateKey);
  exigirVigencia(cert, ahora);

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
