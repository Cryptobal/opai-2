"use client";

import { useState } from "react";

import { changePassword } from "@opai/auth/client";
import { Button, Campo, Input, Sheet } from "@opai/ds";

/** Cambio de contraseña desde el menú de usuario. Cierra las otras sesiones. */
export function CambiarPassword({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(form: FormData) {
    setError(null);
    const actual = String(form.get("actual") ?? "");
    const nueva = String(form.get("nueva") ?? "");
    if (nueva.length < 10)
      return setError("La contraseña nueva debe tener al menos 10 caracteres.");
    if (nueva !== String(form.get("repetir") ?? ""))
      return setError("Las contraseñas no coinciden.");
    setEnviando(true);
    const r = await changePassword({
      currentPassword: actual,
      newPassword: nueva,
      revokeOtherSessions: true,
    });
    setEnviando(false);
    if (r.error) return setError("La contraseña actual no es correcta.");
    setListo(true);
  }

  const cerrar = () => {
    setListo(false);
    setError(null);
    onCerrar();
  };

  return (
    <Sheet abierto={abierto} onCerrar={cerrar} titulo="Cambiar contraseña">
      {listo ? (
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
          <Campo etiqueta="Contraseña nueva" htmlFor="pw-nueva" ayuda="Mínimo 10 caracteres.">
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
            {...(error ? { error } : {})}
          >
            <Input
              id="pw-repetir"
              name="repetir"
              type="password"
              autoComplete="new-password"
              required
            />
          </Campo>
          <Button type="submit" size="lg" disabled={enviando}>
            {enviando ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
