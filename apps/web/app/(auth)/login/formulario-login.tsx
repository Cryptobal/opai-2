"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signIn } from "@opai/auth/client";
import { Alerta, AuthCard, Button, Campo, Input, InputPassword, Separador } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { PiePortales } from "../pie-portales";

export type EstadoLogin =
  | { tipo: "inicial" }
  | { tipo: "cargando" }
  | { tipo: "error"; titulo: string; texto: string }
  | { tipo: "suspendida"; texto: string };

const OLVIDO = "¿Olvidaste tu contraseña?";

/** Login ERP / Plataforma / Supervisor según el diseño aprobado (export-acceso 01 y 02). */
type Props = { destino: string; google: boolean; inicial?: EstadoLogin };

export function FormularioLogin({ destino, google, inicial = { tipo: "inicial" } }: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoLogin>(inicial);
  const cargando = estado.tipo === "cargando";

  async function entrar(form: FormData) {
    setEstado({ tipo: "cargando" });
    const r = await signIn.email({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (!r.error) return router.push(`/elegir-empresa?next=${encodeURIComponent(destino)}`);
    if (r.error.code === "ACCOUNT_SUSPENDED")
      return setEstado({ tipo: "suspendida", texto: r.error.message ?? "" });
    if (r.error.status === 429) {
      return setEstado({
        tipo: "error",
        titulo: "Pausamos el acceso",
        texto: "Hubo demasiados intentos. Vuelve a intentarlo en 15 minutos.",
      });
    }
    setEstado({
      tipo: "error",
      titulo: "El correo o la contraseña no coinciden",
      texto:
        "Revisa los datos y vuelve a intentarlo. Tras 5 intentos pausaremos el acceso por 15 minutos.",
    });
  }

  return (
    <AuthCard
      titulo="Inicia sesión"
      subtitulo="ERP, Plataforma y Supervisor"
      pie={<PiePortales />}
      Link={LinkNext}
    >
      {estado.tipo === "error" ? (
        <Alerta tono="danger" titulo={estado.titulo}>
          {estado.texto}
        </Alerta>
      ) : null}
      {estado.tipo === "suspendida" ? (
        <Alerta tono="warning" titulo="Tu cuenta está suspendida">
          {estado.texto}
        </Alerta>
      ) : null}
      <form action={entrar} className="flex flex-col gap-4">
        <Campo etiqueta="Correo" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="nombre@empresa.cl"
            required
            disabled={cargando}
          />
        </Campo>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="t-label text-fg">
              Contraseña
            </label>
            <LinkNext href="/recuperar" className="hidden text-sm text-accent md:inline">
              {OLVIDO}
            </LinkNext>
          </div>
          <InputPassword
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            required
            disabled={cargando}
            {...(estado.tipo === "error" ? { "aria-invalid": true } : {})}
          />
        </div>
        <Button type="submit" size="lg" block disabled={cargando}>
          {cargando ? "Entrando…" : "Entrar"}
        </Button>
        <LinkNext
          href="/recuperar"
          className="flex min-h-11 items-center justify-center text-sm text-accent md:hidden"
        >
          {OLVIDO}
        </LinkNext>
      </form>
      {google ? (
        <>
          <Separador />
          <Button
            variant="secondary"
            size="lg"
            block
            disabled={cargando}
            onClick={() => void signIn.social({ provider: "google", callbackURL: destino })}
          >
            Continuar con Google
          </Button>
        </>
      ) : null}
    </AuthCard>
  );
}
