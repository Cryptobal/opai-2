"use client";

import { useState } from "react";

import { type Metodo, VerificarMetodo } from "./verificar-metodo";

/**
 * Verificación del segundo factor en el login (NÚCLEO-F). Sin cliente de auth en el navegador: el
 * formulario llama a la Server Action (ADR-037). Alterna entre el código del autenticador (TOTP) y un
 * código de respaldo; al cambiar de método remonta el paso (`key={metodo}`) para limpiar el error y el
 * campo del intento anterior. Diseño con `AuthCard` del DS V2.
 */
export function FormularioVerificar({ destino }: { destino: string }) {
  const [metodo, setMetodo] = useState<Metodo>("totp");
  return (
    <VerificarMetodo
      key={metodo}
      destino={destino}
      metodo={metodo}
      onCambiar={() => setMetodo(metodo === "totp" ? "respaldo" : "totp")}
    />
  );
}
