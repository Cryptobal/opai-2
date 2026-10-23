"use client";

import { Check, CheckCircle2, X } from "lucide-react";
import { useState } from "react";

import { passwordValida, reglasPassword, resetPassword } from "@opai/auth/client";
import {
  AuthCard,
  Button,
  Campo,
  cn,
  EstadoIlustrado,
  estilosBoton,
  Input,
  InputPassword,
} from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Crea la contraseña nueva con el token del enlace y cierra las otras sesiones. */
export function NuevaPassword({ token, correo }: { token: string; correo: string }) {
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    if (!passwordValida(nueva)) return setError("La contraseña no cumple los requisitos.");
    if (nueva !== repetir) return setError("Las contraseñas no coinciden.");
    setEnviando(true);
    const r = await resetPassword({ newPassword: nueva, token });
    setEnviando(false);
    if (r.error) return setError("El enlace venció o ya se usó. Pide uno nuevo.");
    setListo(true);
  }

  if (listo) {
    return (
      <AuthCard
        Link={LinkNext}
        acciones={
          <LinkNext href="/login" className={estilosBoton({ size: "lg", block: true })}>
            Iniciar sesión
          </LinkNext>
        }
      >
        <EstadoIlustrado icono={CheckCircle2} tono="success" titulo="Contraseña actualizada">
          Ya puedes entrar con tu contraseña nueva. Cerramos tus otras sesiones.
        </EstadoIlustrado>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      volver="/login"
      Link={LinkNext}
      titulo="Crea una nueva contraseña"
      subtitulo={`Para ${correo}. Cerraremos tus otras sesiones abiertas.`}
    >
      <form onSubmit={(e) => (e.preventDefault(), void guardar())} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Campo etiqueta="Nueva contraseña" htmlFor="nueva">
            <InputPassword
              id="nueva"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
            />
          </Campo>
          <ul className="flex flex-col gap-1 text-sm" aria-live="polite">
            {reglasPassword(nueva).map((r) => (
              <li
                key={r.id}
                className={cn(
                  "flex items-center gap-2",
                  r.ok ? "text-success-fg" : "text-fg-muted",
                )}
              >
                {r.ok ? (
                  <Check className="size-4" aria-label="cumple" />
                ) : (
                  <X className="size-4" aria-label="falta" />
                )}
                {r.texto}
              </li>
            ))}
          </ul>
        </div>
        <Campo etiqueta="Repite la contraseña" htmlFor="repetir" {...(error ? { error } : {})}>
          <Input
            id="repetir"
            type="password"
            autoComplete="new-password"
            placeholder="Escríbela otra vez"
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            required
          />
        </Campo>
        <Button type="submit" size="lg" block disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </AuthCard>
  );
}
