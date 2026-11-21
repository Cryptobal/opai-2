export type CuentaFirebase = {
  project_id: string;
  client_email: string;
  private_key: string;
};

const URL_OAUTH_GOOGLE = "https://oauth2.googleapis.com/token";

function b64urlDeTexto(t: string): string {
  return btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDeBytes(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return b64urlDeTexto(s);
}

/** Firma JWT RS256 para OAuth de la cuenta de servicio de Firebase (sin SDK, ADR-031). */
export async function firmarJwtFirebase(
  cuenta: CuentaFirebase,
  ahora = Date.now(),
): Promise<string> {
  const cabeza = b64urlDeTexto(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const iat = Math.floor(ahora / 1000);
  const cuerpo = b64urlDeTexto(
    JSON.stringify({
      iss: cuenta.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: URL_OAUTH_GOOGLE,
      exp: iat + 3600,
      iat,
    }),
  );
  const pem = cuenta.private_key.replace(/\\n/g, "\n");
  const pemCuerpo = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(pemCuerpo), (c) => c.charCodeAt(0));
  const clave = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const datos = new TextEncoder().encode(`${cabeza}.${cuerpo}`);
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", clave, datos);
  return `${cabeza}.${cuerpo}.${b64urlDeBytes(new Uint8Array(firma))}`;
}