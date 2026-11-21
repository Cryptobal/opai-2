import type { ReactNode } from "react";

import { Estado } from "@opai/ds";

import { estadoPantalla, textosComplementoInactivo } from "@/lib/formato";

type ResultadoCarga = { ok: boolean; error?: { code: string; message?: string } };

type Props = {
  r: ResultadoCarga;
  variante: "lista" | "detalle";
  children: ReactNode;
};

/** Envuelve cargas Mi DT: complemento inactivo → vacío con mensaje (CAR-741). */
export function EstadoMiDt({ r, variante, children }: Props) {
  const textos = textosComplementoInactivo(r);
  return (
    <Estado state={estadoPantalla(r)} variante={variante} {...(textos ? { textos } : {})}>
      {r.ok ? children : null}
    </Estado>
  );
}