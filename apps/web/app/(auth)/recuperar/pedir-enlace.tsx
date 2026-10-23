"use client";

import { Inbox } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { AuthCard, Button, Campo, EstadoIlustrado, estilosBoton, Input } from "@opai/ds";

import { accionPedirRecuperacion } from "@/app/_acciones/auth";
import { LinkNext } from "@/app/_components/link-next";

const ESPERA = 45;

/** Pide el correo y confirma el envío. Responde igual exista o no la cuenta (Server Action). */
export function PedirEnlace({ enviadoA }: { enviadoA?: string } = {}) {
  const [estado, enviar, pendiente] = useActionState(accionPedirRecuperacion, {
    enviadoA: enviadoA ?? null,
  });
  const [restante, setRestante] = useState(enviadoA ? ESPERA : 0);
  // Cada envío (primero o reenvío) reinicia la espera para reenviar.
  const enviarYContar = (form: FormData) => {
    if (estado.enviadoA && !form.get("email")) form.set("email", estado.enviadoA);
    setRestante(ESPERA);
    enviar(form);
  };

  useEffect(() => {
    if (restante <= 0) return;
    const t = setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [restante]);

  if (estado.enviadoA) {
    return (
      <AuthCard
        volver="/login"
        Link={LinkNext}
        acciones={
          <>
            <LinkNext
              href="/login"
              className={estilosBoton({ variant: "secondary", size: "lg", block: true })}
            >
              Volver a iniciar sesión
            </LinkNext>
            <form action={enviarYContar} className="contents">
              <Button type="submit" variant="ghost" size="lg" disabled={restante > 0 || pendiente}>
                {restante > 0 ? `Reenviar en 0:${String(restante).padStart(2, "0")}` : "Reenviar"}
              </Button>
            </form>
          </>
        }
      >
        <EstadoIlustrado icono={Inbox} tono="info" titulo="Revisa tu correo">
          <p>
            Si existe una cuenta para{" "}
            <strong className="font-semibold text-fg">{estado.enviadoA}</strong>, te enviamos un
            enlace para crear una nueva contraseña. Vence en 30 minutos.
          </p>
          <p className="t-caption mt-3">Si no llega en unos minutos, revisa la carpeta de spam.</p>
        </EstadoIlustrado>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      volver="/login"
      Link={LinkNext}
      titulo="Recupera tu contraseña"
      subtitulo="Escribe el correo con que entras a OPAI. Te enviaremos un enlace para crear una nueva."
    >
      <form action={enviarYContar} className="flex flex-col gap-4">
        <Campo etiqueta="Correo" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="nombre@empresa.cl"
            required
            disabled={pendiente}
          />
        </Campo>
        <Button type="submit" size="lg" block disabled={pendiente}>
          {pendiente ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
    </AuthCard>
  );
}
