import { describe, expect, it, vi } from "vitest";

import { emisorFcm, firmarJwtFirebase } from "./fcm";

async function cuentaPrueba() {
  const par = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign"],
  );
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", par.privateKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const private_key = `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g)?.join("\n")}\n-----END PRIVATE KEY-----`;
  return {
    project_id: "proyecto-prueba",
    client_email: "fcm@proyecto-prueba.iam.gserviceaccount.com",
    private_key,
  };
}

function fetchConFcm(
  respuestaFcm: unknown,
  statusHttp = 404,
): typeof fetch {
  return vi.fn(async (url: string | URL) => {
    const u = new URL(String(url));
    if (u.origin === "https://oauth2.googleapis.com" && u.pathname === "/token") {
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify(respuestaFcm), { status: statusHttp });
  }) as typeof fetch;
}

describe("fcm · HTTP v1 sin SDK", () => {
  it("firma un JWT RS256 con iss y aud de Google", async () => {
    const cuenta = await cuentaPrueba();
    const ahora = Date.UTC(2026, 10, 20, 12);
    const jwt = await firmarJwtFirebase(cuenta, ahora);
    const [, cuerpo] = jwt.split(".") as [string, string, string];
    const json = JSON.parse(
      atob(cuerpo.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(cuerpo.length / 4) * 4, "=")),
    ) as Record<string, unknown>;
    expect(json.iss).toBe(cuenta.client_email);
    expect(json.aud).toBe("https://oauth2.googleapis.com/token");
  });

  it("marca vencida UNREGISTERED en details con status NOT_FOUND", async () => {
    const cuenta = await cuentaPrueba();
    const e = emisorFcm(
      cuenta,
      fetchConFcm({
        error: {
          status: "NOT_FOUND",
          details: [{ errorCode: "UNREGISTERED" }],
        },
      }),
    );
    expect((await e.avisar("token-viejo", "android", "/trabajador")).vencida).toBe(true);
  });

  it("no marca vencida NOT_FOUND sin details de token", async () => {
    const cuenta = await cuentaPrueba();
    const e = emisorFcm(cuenta, fetchConFcm({ error: { status: "NOT_FOUND" } }));
    expect((await e.avisar("token", "android", "/a")).vencida).toBe(false);
  });

  it("no borra por INVALID_ARGUMENT genérico y sanea ruta en el payload", async () => {
    const cuenta = await cuentaPrueba();
    let cuerpoFcm = "";
    const f = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = new URL(String(url));
      if (u.origin === "https://oauth2.googleapis.com" && u.pathname === "/token") {
        return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
      }
      cuerpoFcm = String(init?.body ?? "");
      return new Response(JSON.stringify({ error: { status: "INVALID_ARGUMENT" } }), { status: 400 });
    }) as typeof fetch;
    const e = emisorFcm(cuenta, f);
    expect((await e.avisar("token", "ios", "https://malicia")).vencida).toBe(false);
    expect(cuerpoFcm).toContain('"ruta":"/bandeja"');
  });

  it("falla si OAuth no devuelve access_token", async () => {
    const cuenta = await cuentaPrueba();
    const f = vi.fn(async () => new Response(JSON.stringify({ expires_in: 3600 }), { status: 200 })) as typeof fetch;
    const e = emisorFcm(cuenta, f);
    expect((await e.avisar("token", "android", "/x")).ok).toBe(false);
  });
});