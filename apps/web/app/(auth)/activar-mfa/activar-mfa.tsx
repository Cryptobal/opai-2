"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Alerta, AuthCard, Button, Campo, InputPassword } from "@opai/ds";

import {
  accionConfirmarMfa,
  accionIniciarMfa,
  type ConfirmaMfa,
  type InicioMfa,
} from "@/app/_acciones/mfa";
import { accionSalir } from "@/app/_acciones/auth";
import { LinkNext } from "@/app/_components/link-next";
import { trasLimpiarCaches } from "@/app/_components/pwa/limpiar-cache";

import { PasoEscanear } from "./paso-escanear";

/**
 * Enrolamiento del segundo factor (NÚCLEO-F): paso 1 confirma la contraseña y muestra el QR, la clave
 * manual y los códigos de respaldo (una sola vez); paso 2 confirma con un código del autenticador y lo
 * activa. Sin cliente de auth en el navegador (ADR-037). Siempre vuelve a `destino` al terminar.
 * Enrolamiento obligatorio (`obligatoria`): pie «Cerrar sesión» para no quedar atrapado; opcional (desde
 * Mi cuenta): «volver» al origen. Diseño con el DS V2.
 */
export function ActivarMfa({ destino, obligatoria }: { destino: string; obligatoria: boolean }) {
  const router = useRouter();
  const [inicio, iniciar, iniciando] = useActionState<InicioMfa | null, FormData>(
    accionIniciarMfa,
    null,
  );
  const [confirma, confirmar, confirmando] = useActionState<ConfirmaMfa | null, FormData>(
    accionConfirmarMfa,
    null,
  );
  useEffect(() => {
    if (confirma?.ok) router.replace(destino);
  }, [confirma, destino, router]);

  // Enrolamiento obligatorio: el gate de `PaginaPortal` manda aquí desde cualquier portal, así que el
  // único camino de vuelta es cerrar sesión (volver a un portal reenviaría aquí). Opcional: «volver».
  const pie = obligatoria ? (
    <Button variant="ghost" size="md" onClick={() => trasLimpiarCaches(accionSalir)}>
      Cerrar sesión
    </Button>
  ) : (
    <LinkNext href={destino}>Volver a Mi cuenta</LinkNext>
  );

  if (inicio?.ok) {
    return (
      <AuthCard
        titulo="Escanea el código"
        subtitulo="Con tu app de autenticación (Google Authenticator, 1Password, …)"
        Link={LinkNext}
        pie={pie}
        {...(obligatoria ? {} : { volver: destino })}
      >
        <PasoEscanear
          svg={inicio.svg}
          secret={inicio.secret}
          codigos={inicio.codigos}
          confirmar={confirmar}
          confirmando={confirmando}
          error={confirma && !confirma.ok ? confirma.error : undefined}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo="Activa el segundo factor"
      subtitulo="Un paso más para proteger tu cuenta"
      Link={LinkNext}
      pie={pie}
      {...(obligatoria ? {} : { volver: destino })}
    >
      {inicio && !inicio.ok ? (
        <div id="mfa-error-iniciar">
          <Alerta tono="danger" titulo="No pudimos continuar">
            {inicio.error}
          </Alerta>
        </div>
      ) : null}
      <p className="text-sm text-fg-muted">
        Confirma tu contraseña para generar el código del autenticador y tus códigos de respaldo.
      </p>
      <form action={iniciar} className="flex flex-col gap-4">
        <Campo etiqueta="Contraseña" htmlFor="password">
          <InputPassword
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            required
            disabled={iniciando}
            {...(inicio && !inicio.ok
              ? { "aria-invalid": true, "aria-describedby": "mfa-error-iniciar" }
              : {})}
          />
        </Campo>
        <Button type="submit" size="lg" block cargando={iniciando}>
          Continuar
        </Button>
      </form>
    </AuthCard>
  );
}
