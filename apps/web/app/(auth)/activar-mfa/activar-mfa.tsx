"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Alerta,
  AuthCard,
  Button,
  Campo,
  CodigoQr,
  CodigosRespaldo,
  Input,
  InputPassword,
} from "@opai/ds";

import {
  accionConfirmarMfa,
  accionIniciarMfa,
  type ConfirmaMfa,
  type InicioMfa,
} from "@/app/_acciones/mfa";
import { LinkNext } from "@/app/_components/link-next";

/**
 * Enrolamiento del segundo factor (NÚCLEO-F): paso 1 confirma la contraseña y muestra el QR y los
 * códigos de respaldo (una sola vez); paso 2 confirma con un código del autenticador y lo activa. Sin
 * cliente de auth en el navegador (ADR-037). Con `destino` (enrolamiento obligatorio) sigue allí al
 * terminar; sin él (Mi cuenta) refresca para mostrar el nuevo estado. Diseño mínimo con el DS V2.
 */
export function ActivarMfa({ destino }: { destino?: string }) {
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
    if (confirma?.ok) {
      if (destino) router.replace(destino);
      else router.refresh();
    }
  }, [confirma, destino, router]);

  if (inicio?.ok) {
    return (
      <AuthCard titulo="Escanea el código" subtitulo="Con tu app de autenticación (Google Authenticator, 1Password, …)">
        {confirma && !confirma.ok ? (
          <Alerta tono="danger" titulo="No pudimos activar el segundo factor">
            {confirma.error}
          </Alerta>
        ) : null}
        <div className="flex flex-col items-center gap-3">
          <CodigoQr svg={inicio.svg} />
          <p className="text-center text-sm text-fg-muted">
            Guarda estos códigos de respaldo en un lugar seguro. Te dejan entrar si pierdes el
            autenticador y no los verás de nuevo.
          </p>
          <CodigosRespaldo codigos={inicio.codigos} className="w-full" />
        </div>
        <form action={confirmar} className="flex flex-col gap-4">
          <Campo etiqueta="Código de 6 dígitos" htmlFor="codigo">
            <Input
              id="codigo"
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              required
              disabled={confirmando}
            />
          </Campo>
          <Button type="submit" size="lg" block disabled={confirmando}>
            {confirmando ? "Activando…" : "Activar segundo factor"}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo="Activa el segundo factor"
      subtitulo="Un paso más para proteger tu cuenta"
      Link={LinkNext}
    >
      {inicio && !inicio.ok ? (
        <Alerta tono="danger" titulo="No pudimos continuar">
          {inicio.error}
        </Alerta>
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
          />
        </Campo>
        <Button type="submit" size="lg" block disabled={iniciando}>
          {iniciando ? "Generando…" : "Continuar"}
        </Button>
      </form>
    </AuthCard>
  );
}
