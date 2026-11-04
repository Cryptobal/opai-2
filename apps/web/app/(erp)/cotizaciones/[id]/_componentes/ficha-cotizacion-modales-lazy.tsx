"use client";

import dynamic from "next/dynamic";

export const HojaEnviarCotizacionLazy = dynamic(
  () => import("./hoja-enviar-cotizacion").then((x) => x.HojaEnviarCotizacion),
  { ssr: false },
);

export const DialogoVistaPreviaPdfLazy = dynamic(
  () => import("./dialogo-vista-previa-pdf").then((x) => x.DialogoVistaPreviaPdf),
  { ssr: false },
);

export const HojaMargenFinanzasLazy = dynamic(
  () => import("./hoja-margen-finanzas").then((x) => x.HojaMargenFinanzas),
  { ssr: false },
);
