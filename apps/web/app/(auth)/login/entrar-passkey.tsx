"use client";

import { Fingerprint } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { accionEntrarConPasskey, accionOpcionesEntrarPasskey } from "@/app/_acciones/passkeys";
import {
  cancelarCeremonia,
  mensajeWebAuthn,
  soportaAutocompletado,
  usarPasskey,
  useSoportaPasskeys,
} from "@/app/_components/webauthn";

/**
 * «Entrar con passkey» (CAR-286): Face ID, huella o llave, sin contraseña ni códigos. Si el navegador
 * lo permite, además ofrece la passkey en el autocompletado del campo de correo (mediación
 * condicional). La verificación y la sesión las hace el servidor.
 */
export function EntrarConPasskey({
  destino,
  deshabilitado = false,
  autocompletar = true,
  texto = "Entrar con passkey",
  principal = false,
}: {
  destino: string;
  deshabilitado?: boolean;
  /** Ofrecer la passkey en el autocompletado del correo (solo en el login). */
  autocompletar?: boolean;
  texto?: string;
  /** Acción principal de la pantalla (segundo paso solo con passkey). */
  principal?: boolean;
}) {
  const soporta = useSoportaPasskeys();
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autocompletado = useRef(false);

  // Una ceremonia a la vez: el desafío vive en una sola cookie, así que el botón cancela el
  // autocompletado condicional antes de pedir el suyo y una respuesta de una ceremonia anterior se
  // descarta (verificarla contra el desafío nuevo fallaría y lo consumiría).
  const ceremonia = useRef(0);
  async function entrar(condicional: boolean) {
    const mia = ++ceremonia.current;
    if (!condicional) await cancelarCeremonia();
    const op = await accionOpcionesEntrarPasskey();
    if (mia !== ceremonia.current) return;
    if (!op.ok) return setError(op.mensaje);
    const respuesta = await usarPasskey(op.opciones, condicional);
    if (mia !== ceremonia.current) return;
    setPendiente(true);
    const r = await accionEntrarConPasskey(destino, respuesta);
    setPendiente(false);
    setError(r.mensaje);
  }

  useEffect(() => {
    if (!autocompletar || autocompletado.current) return;
    autocompletado.current = true;
    void soportaAutocompletado().then((si) => {
      // Mediación condicional: espera en segundo plano a que elija la passkey en el autocompletado.
      if (si) entrar(true).catch(() => undefined);
    });
    // `entrar` solo depende de props estables del montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!soporta) return null;
  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <Alerta tono="danger" titulo="No pudimos entrar con la passkey">
          {error}
        </Alerta>
      ) : null}
      <Button
        type="button"
        variant={principal ? "primary" : "secondary"}
        size="lg"
        block
        cargando={pendiente}
        disabled={deshabilitado || pendiente}
        onClick={() => {
          setError(null);
          entrar(false).catch((e: unknown) => setError(mensajeWebAuthn(e)));
        }}
      >
        <Fingerprint aria-hidden className="size-5" />
        {texto}
      </Button>
    </div>
  );
}
