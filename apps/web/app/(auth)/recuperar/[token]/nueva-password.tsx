"use client";

import { Check, CheckCircle2, X } from "lucide-react";
import { useActionState, useState } from "react";

import { reglasPassword } from "@opai/auth/opciones";
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

import { accionRestablecer } from "@/app/_acciones/auth";
import { LinkNext } from "@/app/_components/link-next";

/** Crea la contraseña nueva con el token del enlace y cierra las otras sesiones (Server Action). */
export function NuevaPassword({ token, correo }: { token: string; correo: string }) {
  const [nueva, setNueva] = useState("");
  const [estado, guardar, pendiente] = useActionState(accionRestablecer.bind(null, token), {
    listo: false,
  });

  if (estado.listo) {
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
      <form action={guardar} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Campo etiqueta="Nueva contraseña" htmlFor="nueva">
            <InputPassword
              id="nueva"
              name="nueva"
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
        <Campo
          etiqueta="Repite la contraseña"
          htmlFor="repetir"
          {...(estado.error ? { error: estado.error } : {})}
        >
          <Input
            id="repetir"
            name="repetir"
            type="password"
            autoComplete="new-password"
            placeholder="Escríbela otra vez"
            required
          />
        </Campo>
        <Button type="submit" size="lg" block disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </AuthCard>
  );
}
