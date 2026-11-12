import { ShieldAlert, ShieldCheck } from "lucide-react";

import { Alerta } from "@opai/ds";

import { AVISO_SOLO_PASSWORD, type Metodos } from "./tipos";

/** Resumen del nivel de protección: protegida, o aviso claro del riesgo (sin bloquear). */
export function EstadoSeguridad({ m }: { m: Metodos }) {
  if (m.conSegundoFactor)
    return (
      <Alerta tono="success" icono={ShieldCheck} titulo="Tu cuenta tiene un segundo factor">
        Además de tu contraseña, te pediremos tu passkey o un código de la app autenticadora.
      </Alerta>
    );
  return (
    <Alerta
      tono="warning"
      icono={ShieldAlert}
      titulo={
        m.segundoFactorObligatorio
          ? "Tu cuenta de plataforma requiere un segundo factor"
          : "Tu cuenta entra solo con contraseña"
      }
    >
      {AVISO_SOLO_PASSWORD}
    </Alerta>
  );
}
