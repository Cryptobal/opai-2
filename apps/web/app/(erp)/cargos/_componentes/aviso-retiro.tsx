"use client";

import { useSyncExternalStore } from "react";
import { Alerta, Button } from "@opai/ds";

const CLAVE = "opai.07b.aviso-cargo-cerrado";
const evento = "opai-aviso-cargo";
let cerradoEnVisita = false;
const suscribir = (fn: () => void) => {
  window.addEventListener(evento, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(evento, fn);
    window.removeEventListener("storage", fn);
  };
};
function cerrado() {
  if (cerradoEnVisita) return true;
  try {
    return window.localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
}
export function AvisoRetiro() {
  const oculto = useSyncExternalStore(suscribir, cerrado, () => false);
  if (oculto) return null;
  return (
    <Alerta
      tono="info"
      titulo="Los sueldos se definen en instalación, puesto o persona. Las estructuras antiguas de cargo quedan en solo lectura."
      accion={
        <Button
          variant="ghost"
          onClick={() => {
            cerradoEnVisita = true;
            try {
              window.localStorage.setItem(CLAVE, "1");
            } catch {
              /* Sin persistencia solo se recuerda durante esta visita. */
            }
            window.dispatchEvent(new Event(evento));
          }}
        >
          Entendido
        </Button>
      }
    />
  );
}
