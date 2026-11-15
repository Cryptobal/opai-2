import { Suspense } from "react";

import { Loading } from "@opai/ds";

import { ContenidoEntrar } from "./contenido";

export const metadata = { title: "Entrar" };

/**
 * Entrada de la PWA (`start_url` del manifest, ADR-044.1) y de las apps nativas (Brief 17). Con
 * sesión lleva a la persona a su portal: el guardado en este dispositivo (cookie, sin base ni
 * auditoría; D1 del Brief 04) o el único que tenga; con varios y sin preferencia, muestra un
 * selector. Sin sesión, un equipo de terreno emparejado entra a Terreno y el resto va al ingreso
 * (`proxy.ts` deja pasar `/entrar` sin sesión solo cuando trae la cookie del equipo).
 */
export default function Entrar() {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4" />}>
      <ContenidoEntrar />
    </Suspense>
  );
}
