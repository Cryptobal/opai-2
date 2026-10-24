"use client";

import { useActionState } from "react";

import { Alerta, AuthCard, Button, Campo, Input, InputPassword, Separador } from "@opai/ds";

import { accionEntrar, accionGoogle, type EstadoLogin } from "@/app/_acciones/auth";
import { LinkNext } from "@/app/_components/link-next";
import { useEpocaSesion } from "@/app/_components/refresco-navegador";

import { PiePortales } from "../pie-portales";

export type { EstadoLogin };

const OLVIDO = "¿Olvidaste tu contraseña?";

type Props = {
  destino: string;
  google: boolean;
  inicial?: EstadoLogin;
  cargando?: boolean;
  /** Época de la sesión del request; sin ella (p. ej. en /ds) la página no participa. */
  epoca?: string;
};

/**
 * Login ERP / Plataforma / Supervisor según el diseño aprobado (export-acceso 01 y 02).
 * Sin cliente de auth en el navegador: el formulario llama a la Server Action (ADR-037).
 */
export function FormularioLogin({ destino, google, inicial, cargando: forzado, epoca }: Props) {
  const [estado, entrar, pendiente] = useActionState(
    accionEntrar.bind(null, destino),
    inicial ?? ({ tipo: "inicial" } as EstadoLogin),
  );
  useEpocaSesion(epoca ?? null); // si otra pestaña entra o sale, esta recarga
  const cargando = pendiente || forzado === true;
  const google_ = accionGoogle.bind(null, destino);

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
          <form action={google_}>
            <Button type="submit" variant="secondary" size="lg" block disabled={cargando}>
              Continuar con Google
            </Button>
          </form>
        </>
      ) : null}
    </AuthCard>
  );
}
