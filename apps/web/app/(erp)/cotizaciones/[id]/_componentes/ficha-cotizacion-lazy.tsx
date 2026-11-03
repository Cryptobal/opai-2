"use client";

import dynamic from "next/dynamic";

import { Loading } from "@opai/ds";

import type { DatosFichaCotizacion } from "../../_componentes/datos";

const FichaCotizacion = dynamic(
  () => import("./ficha-cotizacion").then((m) => m.FichaCotizacion),
  { loading: () => <Loading variante="detalle" /> },
);

export function FichaCotizacionLazy({ datos }: { datos: DatosFichaCotizacion }) {
  return <FichaCotizacion datos={datos} />;
}
