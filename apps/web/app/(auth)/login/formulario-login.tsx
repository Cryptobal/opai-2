"use client";

import Link from "next/link";
import { useState } from "react";

import { signIn } from "@opai/auth/client";
import { Button, Campo, Input } from "@opai/ds";

const MENSAJES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña incorrectos.",
  TOO_MANY_REQUESTS: "Demasiados intentos. Espera un minuto.",
};

/** Login con correo y contraseña; Google si hay credenciales. Errores en línea. */
export function FormularioLogin({ destino, google }: { destino: string; google: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(form: FormData) {
    setError(null);
    setEnviando(true);
    const r = await signIn.email({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (r.error) {
      setEnviando(false);
      const code = r.error.code ?? (r.error.status === 429 ? "TOO_MANY_REQUESTS" : "");
      setError(
        MENSAJES[code] ??
          "No pudimos iniciar sesión. Si tu empresa está suspendida, contacta a tu administrador.",
      );
      return;
    }
    window.location.assign(destino);
  }

  return (
    <form action={entrar} className="flex flex-col gap-4">
      <h1 className="t-heading text-fg">Entrar</h1>
      <Campo etiqueta="Correo" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
        />
      </Campo>
      <Campo etiqueta="Contraseña" htmlFor="password" {...(error ? { error } : {})}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          {...(error ? { "aria-invalid": true } : {})}
        />
      </Campo>
      <Button type="submit" size="lg" block disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Button>
      {google ? (
        <Button
          variant="secondary"
          size="lg"
          block
          onClick={() => void signIn.social({ provider: "google", callbackURL: destino })}
        >
          Continuar con Google
        </Button>
      ) : null}
      <Link
        href="/recuperar"
        className="flex min-h-11 items-center justify-center text-base text-fg-muted hover:text-fg"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
