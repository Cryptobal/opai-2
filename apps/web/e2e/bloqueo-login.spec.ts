import { expect, test } from "@playwright/test";

// B1 (Brief 07c): el bloqueo de login se cuenta sobre los intentos persistidos (append-only) y se
// engancha en la capa de Better Auth, así que aplica también a un POST directo a
// /api/auth/.../sign-in/email, SIN pasar por la Server Action `accionEntrar` ni por su contador en
// memoria (`apps/web/lib/rate-limit.ts`). Así el límite no se evita saltándose la UI (§2.1, §4.1,
// §12). Usuario dedicado sembrado por seed:e2e; bloquearlo no afecta a los demás specs. El bloqueo en
// dev es la única barrera (el rate limit de la librería solo se activa en producción), por eso los
// primeros intentos devuelven 401 y, tras el umbral de correo+IP (5), 429. La cabecera
// `x-forwarded-for` fija la IP del cliente, como la pone Vercel (primer valor) en producción.
const EMAIL = "bloqueo-e2e@opai.cl";
const RUTA = "/api/auth/sign-in/email";
const IP = "203.0.113.200";

test.describe("bloqueo de login por acceso directo (B1)", () => {
  test("tras 5 intentos fallidos directos, el endpoint pausa la cuenta (429), no la UI", async (
    { request },
    info,
  ) => {
    // Prueba de backend: basta una vez (no depende del viewport). Se corre solo en un proyecto.
    test.skip(info.project.name !== "desktop", "Prueba de backend, un solo proyecto");
    const intentar = (password: string) =>
      request.post(RUTA, {
        data: { email: EMAIL, password },
        headers: { "x-forwarded-for": IP },
        failOnStatusCode: false,
      });

    // 1..5: credenciales inválidas → 401 (el contador persistido sube en cada fallo).
    for (let i = 1; i <= 5; i++) {
      const res = await intentar(`mala-clave-${i}`);
      expect(res.status(), `intento ${i} debe ser credenciales inválidas`).toBe(401);
    }

    // 6: aunque la petición entra directa al endpoint (sin Server Action), el bloqueo persistido
    // aplica y responde 429, con el motivo genérico que no revela si el correo existe.
    const bloqueado = await intentar("mala-clave-6");
    expect(bloqueado.status()).toBe(429);
    const cuerpo = await bloqueado.json().catch(() => ({}));
    expect(cuerpo.code).toBe("ACCOUNT_LOCKED");
  });
});
