"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, Button, Campo, Dialog, Input, InputPassword, RadioGroup } from "@opai/ds";

import {
  accionOpcionesConfirmarPasskey,
  accionQuitarMetodo,
  type Quitar,
} from "@/app/_acciones/metodos-acceso";
import { mensajeWebAuthn, usarPasskey } from "@/app/_components/webauthn";

import { AVISO_SOLO_PASSWORD, type Metodos, restantesAlQuitar } from "./tipos";

type Forma = "password" | "codigo" | "passkey";

/**
 * Quitar un método (CAR-286): confirma con la contraseña, un código de la app o una passkey vigente.
 * Si queda solo con contraseña, avisa del riesgo antes, sin impedirlo (salvo plataforma).
 */
export function QuitarMetodo({
  quitar,
  etiqueta,
  m,
  onCerrar,
}: {
  quitar: Quitar;
  etiqueta: string;
  m: Metodos;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const formas: { valor: Forma; etiqueta: string }[] = [
    ...(m.tieneContrasena ? [{ valor: "password" as const, etiqueta: "Contraseña" }] : []),
    ...(m.appAutenticadora ? [{ valor: "codigo" as const, etiqueta: "Código de la app" }] : []),
    ...(m.passkeys.length > 0 ? [{ valor: "passkey" as const, etiqueta: "Una passkey" }] : []),
  ];
  const [forma, setForma] = useState<Forma>(formas[0]?.valor ?? "passkey");
  const [valor, setValor] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ultimo = restantesAlQuitar(m) === 0;

  async function confirmar() {
    setError(null);
    setPendiente(true);
    try {
      let r;
      if (forma === "passkey") {
        const op = await accionOpcionesConfirmarPasskey();
        if (!op) return setError("No tienes passkeys para confirmar.");
        r = await accionQuitarMetodo(quitar, { tipo: "passkey", respuesta: await usarPasskey(op) });
      } else r = await accionQuitarMetodo(quitar, { tipo: forma, valor });
      if (!r.ok) return setError(r.error);
      onCerrar();
      router.refresh();
    } catch (e) {
      setError(mensajeWebAuthn(e));
    } finally {
      setPendiente(false);
    }
  }

  return (
    <Dialog
      abierto
      onCerrar={onCerrar}
      titulo={`Quitar ${etiqueta}`}
      descripcion="Para proteger tu cuenta, confirma que eres tú."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar} disabled={pendiente}>
            Cancelar
          </Button>
          <Button variant="destructive" cargando={pendiente} onClick={() => void confirmar()}>
            Quitar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {ultimo && m.segundoFactorObligatorio ? (
          <Alerta tono="danger" titulo="Tu cuenta de plataforma requiere un segundo factor">
            Agrega otro método antes de quitar este.
          </Alerta>
        ) : ultimo ? (
          <Alerta tono="warning" titulo="Tu cuenta quedará solo con contraseña">
            {AVISO_SOLO_PASSWORD}
          </Alerta>
        ) : null}
        {error ? (
          <Alerta tono="danger" titulo="No se pudo quitar">
            {error}
          </Alerta>
        ) : null}
        {formas.length > 1 ? (
          <RadioGroup
            etiqueta="Confirmar con"
            valor={forma}
            opciones={formas}
            onCambiar={(v) => {
              setForma(v as Forma);
              setValor("");
            }}
          />
        ) : null}
        {forma === "password" ? (
          <Campo etiqueta="Contraseña" htmlFor="q-password">
            <InputPassword
              id="q-password"
              autoComplete="current-password"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              disabled={pendiente}
            />
          </Campo>
        ) : forma === "codigo" ? (
          <Campo etiqueta="Código de la app autenticadora" htmlFor="q-codigo">
            <Input
              id="q-codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/\D/g, ""))}
              disabled={pendiente}
            />
          </Campo>
        ) : (
          <p className="text-sm text-fg-muted">
            Al tocar «Quitar», tu dispositivo te pedirá Face ID, huella o el PIN de tu llave.
          </p>
        )}
      </div>
    </Dialog>
  );
}
