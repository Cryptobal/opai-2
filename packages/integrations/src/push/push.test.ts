import { describe, expect, it } from "vitest";

import { emisorPush, emisorPushDelEntorno, firmarVapid } from ".";

const aB64 = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const deB64 = (s: string) =>
  Uint8Array.from(
    atob(
      s
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(s.length / 4) * 4, "="),
    ),
    (c) => c.charCodeAt(0),
  );

/** Par de claves de prueba generado en el momento: nunca claves reales. */
async function clavesDePrueba() {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const publica = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", par.privateKey);
  return {
    par,
    claves: { publica: aB64(publica), privada: jwk.d ?? "", sujeto: "mailto:avisos@opai.cl" },
  };
}

describe("push · VAPID sin contenido", () => {
  it("firma un JWT ES256 válido para el origen del endpoint", async () => {
    const { par, claves } = await clavesDePrueba();
    const ahora = Date.UTC(2026, 10, 13, 12);
    const jwt = await firmarVapid(claves, "https://fcm.googleapis.com/fcm/send/abc", ahora);
    const [cabeza, cuerpo, firma] = jwt.split(".") as [string, string, string];
    const claims = JSON.parse(new TextDecoder().decode(deB64(cuerpo))) as Record<string, unknown>;
    expect(claims).toEqual({
      aud: "https://fcm.googleapis.com",
      exp: ahora / 1000 + 43_200,
      sub: "mailto:avisos@opai.cl",
    });
    const valido = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      par.publicKey,
      deB64(firma),
      new TextEncoder().encode(`${cabeza}.${cuerpo}`),
    );
    expect(valido).toBe(true);
  });

  it("envía un POST sin cuerpo y marca vencida la suscripción que ya no existe", async () => {
    const { claves } = await clavesDePrueba();
    const llamadas: RequestInit[] = [];
    const f: typeof fetch = async (_u, init) => {
      llamadas.push(init ?? {});
      return new Response(null, { status: llamadas.length === 1 ? 201 : 410 });
    };
    const e = emisorPush(claves, f);
    expect(await e.avisar("https://fcm.googleapis.com/fcm/send/a")).toEqual({
      ok: true,
      estado: 201,
      vencida: false,
    });
    expect(await e.avisar("https://updates.push.services.mozilla.com/wpush/v2/b")).toEqual({
      ok: false,
      estado: 410,
      vencida: true,
    });
    expect(llamadas[0]?.body).toBeUndefined();
    expect(String((llamadas[0]?.headers as Record<string, string>)["Authorization"])).toMatch(
      /^vapid t=.+, k=/,
    );
  });

  it("solo acepta endpoints de servicios de push conocidos (sin SSRF)", async () => {
    const { endpointPushValido } = await import(".");
    expect(endpointPushValido("https://web.push.apple.com/abc")).toBe(true);
    expect(endpointPushValido("https://fcm.googleapis.com.evil.cl/x")).toBe(false);
    expect(endpointPushValido("https://169.254.169.254/latest")).toBe(false);
    expect(endpointPushValido("http://fcm.googleapis.com/x")).toBe(false);
    expect(endpointPushValido("https://fcm.googleapis.com:8443/x")).toBe(false);
  });

  it("sin las tres variables del entorno, el push queda apagado", () => {
    expect(emisorPushDelEntorno({ VAPID_PUBLIC_KEY: "x", VAPID_PRIVATE_KEY: "y" })).toBeNull();
  });
});
