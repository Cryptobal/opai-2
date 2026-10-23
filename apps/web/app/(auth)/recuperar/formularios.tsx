"use client";

import Link from "next/link";
import { useState } from "react";

import { requestPasswordReset, resetPassword } from "@opai/auth/client";
import { Button, Campo, Input } from "@opai/ds";

const volver = (
  <Link
    href="/login"
    className="flex min-h-11 items-center justify-center text-base text-fg-muted hover:text-fg"
  >
    Volver a entrar
  </Link>
);

/** Pide el correo. Siempre responde igual, exista o no la cuenta. */
export function PedirEnlace({ enlaceInvalido }: { enlaceInvalido: boolean }) {
  const [enviado, setEnviado] = useState(false);
  async function pedir(form: FormData) {
    await requestPasswordReset({
      email: String(form.get("email") ?? "").trim(),
      redirectTo: "/recuperar",
    });
    setEnviado(true);
  }
  if (enviado) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="t-heading text-fg">Revisa tu correo</h1>
        <p className="text-base text-fg-muted">
          Si existe una cuenta con ese correo, te enviamos un enlace para crear una contraseña
          nueva. Vence en 72 horas.
        </p>
        {volver}
      </div>
    );
  }
  return (
    <form action={pedir} className="flex flex-col gap-4">
      <h1 className="t-heading text-fg">Recuperar contraseña</h1>
      {enlaceInvalido ? (
        <p className="text-sm font-medium text-danger-fg">
          El enlace venció o ya se usó. Pide uno nuevo.
        </p>
      ) : null}
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
      <Button type="submit" size="lg" block>
        Enviar enlace
      </Button>
      {volver}
    </form>
  );
}

/** Fija la contraseña nueva con el token del enlace (un solo uso). */
export function NuevaPassword({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  async function guardar(form: FormData) {
    const nueva = String(form.get("nueva") ?? "");
    if (nueva.length < 10) return setError("Mínimo 10 caracteres.");
    if (nueva !== String(form.get("repetir") ?? ""))
      return setError("Las contraseñas no coinciden.");
    const r = await resetPassword({ newPassword: nueva, token });
    if (r.error) return setError("El enlace venció o ya se usó. Pide uno nuevo.");
    setListo(true);
  }
  if (listo) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="t-heading text-fg">Contraseña actualizada</h1>
        <p className="text-base text-fg-muted">Ya puedes entrar con tu contraseña nueva.</p>
        {volver}
      </div>
    );
  }
  return (
    <form action={guardar} className="flex flex-col gap-4">
      <h1 className="t-heading text-fg">Contraseña nueva</h1>
      <Campo etiqueta="Contraseña nueva" htmlFor="nueva" ayuda="Mínimo 10 caracteres.">
        <Input id="nueva" name="nueva" type="password" autoComplete="new-password" required />
      </Campo>
      <Campo etiqueta="Repite la contraseña" htmlFor="repetir" {...(error ? { error } : {})}>
        <Input id="repetir" name="repetir" type="password" autoComplete="new-password" required />
      </Campo>
      <Button type="submit" size="lg" block>
        Guardar contraseña
      </Button>
    </form>
  );
}
