"use client";

import { Avatar, Campo, Input, InputPassword } from "@opai/ds";

/** Cuenta existente (o sesión abierta): avatar, nombre y correo. */
export function Tarjeta({ nombre, email }: { nombre: string; email: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <Avatar nombre={nombre} size="lg" />
      <span className="min-w-0">
        <span className="block truncate text-base font-medium text-fg">{nombre}</span>
        <span className="block truncate text-sm text-fg-muted">{email}</span>
      </span>
    </div>
  );
}

type Props = {
  email: string;
  error: string | null;
  onEnviar: (nombre: string, password: string) => void;
};

/** Crear cuenta con el correo invitado (bloqueado). El botón vive en las acciones de la tarjeta. */
export function FormularioCuenta({ email, error, onEnviar }: Props) {
  return (
    <form
      id="crear-cuenta"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onEnviar(String(f.get("nombre") ?? ""), String(f.get("password") ?? ""));
      }}
      className="flex flex-col gap-4"
    >
      <Campo etiqueta="Correo" htmlFor="correo" ayuda="La invitación es para este correo.">
        <Input id="correo" value={email} readOnly className="bg-fill text-fg-muted" />
      </Campo>
      <Campo etiqueta="Nombre y apellido" htmlFor="nombre">
        <Input id="nombre" name="nombre" autoComplete="name" required minLength={2} />
      </Campo>
      <Campo
        etiqueta="Contraseña"
        htmlFor="password"
        ayuda="Al menos 10 caracteres, con una letra y un número."
        {...(error ? { error } : {})}
      >
        <InputPassword
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="Al menos 10 caracteres"
          required
        />
      </Campo>
    </form>
  );
}
