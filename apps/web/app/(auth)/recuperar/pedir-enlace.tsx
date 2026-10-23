"use client";

import { Inbox } from "lucide-react";
import { useEffect, useState } from "react";

import { requestPasswordReset } from "@opai/auth/client";
import { AuthCard, Button, Campo, EstadoIlustrado, estilosBoton, Input } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

const ESPERA = 45;

/** Pide el correo y confirma el envío. Responde igual exista o no la cuenta. */
export function PedirEnlace({ enviadoA }: { enviadoA?: string } = {}) {
  const [email, setEmail] = useState(enviadoA ?? "");
  const [enviado, setEnviado] = useState(Boolean(enviadoA));
  const [restante, setRestante] = useState(enviadoA ? ESPERA : 0);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (restante <= 0) return;
    const t = setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [restante]);

  async function enviar() {
    setEnviando(true);
    await requestPasswordReset({ email: email.trim(), redirectTo: "/recuperar" });
    setEnviando(false);
    setEnviado(true);
    setRestante(ESPERA);
  }

  if (enviado) {
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
            <Button variant="ghost" size="lg" disabled={restante > 0 || enviando} onClick={enviar}>
              {restante > 0 ? `Reenviar en 0:${String(restante).padStart(2, "0")}` : "Reenviar"}
            </Button>
          </>
        }
      >
        <EstadoIlustrado icono={Inbox} tono="info" titulo="Revisa tu correo">
          <p>
            Si existe una cuenta para{" "}
            <strong className="font-semibold text-fg">{email.trim()}</strong>, te enviamos un enlace
            para crear una nueva contraseña. Vence en 30 minutos.
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
      <form onSubmit={(e) => (e.preventDefault(), void enviar())} className="flex flex-col gap-4">
        <Campo etiqueta="Correo" htmlFor="email">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="nombre@empresa.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Campo>
        <Button type="submit" size="lg" block disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
    </AuthCard>
  );
}
