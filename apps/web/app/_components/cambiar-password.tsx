"use client";

import { useActionState } from "react";

import { Button, Campo, Input, Sheet } from "@opai/ds";

import { accionCambiarPassword } from "@/app/_acciones/auth";

/** Cambio de contraseña desde el menú de usuario (Server Action). Cierra las otras sesiones. */
export function CambiarPassword({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [estado, enviar, pendiente] = useActionState(accionCambiarPassword, {
    estado: "inicial",
  });

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Cambiar contraseña">
      {estado.estado === "listo" ? (
        <p className="text-base text-fg">
          Listo. Tu contraseña cambió y cerramos tus otras sesiones.
        </p>
      ) : (
        <form action={enviar} className="flex flex-col gap-4">
          <Campo etiqueta="Contraseña actual" htmlFor="pw-actual">
            <Input
              id="pw-actual"
              name="actual"
              type="password"
              autoComplete="current-password"
              required
            />
          </Campo>
          <Campo
            etiqueta="Contraseña nueva"
            htmlFor="pw-nueva"
            ayuda="Al menos 10 caracteres, con una letra y un número."
          >
            <Input
              id="pw-nueva"
              name="nueva"
              type="password"
              autoComplete="new-password"
              required
            />
          </Campo>
          <Campo
            etiqueta="Repite la contraseña nueva"
            htmlFor="pw-repetir"
            {...(estado.error ? { error: estado.error } : {})}
          >
            <Input
              id="pw-repetir"
              name="repetir"
              type="password"
              autoComplete="new-password"
              required
            />
          </Campo>
          <Button type="submit" size="lg" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
