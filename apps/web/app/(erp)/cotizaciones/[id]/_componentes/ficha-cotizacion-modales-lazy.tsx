"use client";

import dynamic from "next/dynamic";

export const DialogoEnviarCotizacionLazy = dynamic(
  () => import("./dialogo-enviar-cotizacion").then((x) => x.DialogoEnviarCotizacion),
  { ssr: false },
);

export const DialogoVistaPreviaPdfLazy = dynamic(
  () => import("./dialogo-vista-previa-pdf").then((x) => x.DialogoVistaPreviaPdf),
  { ssr: false },
);
