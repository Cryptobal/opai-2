"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de personas: se descargan al abrirse (ADR-037).
export const HojaPersona = hojaDiferida(["editar", "nueva"], () =>
  import("./hoja-persona").then((m) => m.HojaPersona),
);
export const HojaVincularUsuario = hojaDiferida(["vincular"], () =>
  import("./hoja-vincular").then((m) => m.HojaVincularUsuario),
);
export const HojaVinculo = hojaDiferida(["vinculo"], () =>
  import("./hoja-vinculo").then((m) => m.HojaVinculo),
);

export const HojaEditarVinculo = hojaDiferida(["editar-vinculo"], () =>
  import("./hoja-editar-vinculo").then((m) => m.HojaEditarVinculo),
);

export const HojaLaboral = hojaDiferida(
  [
    "editar-prevision",
    "editar-uniforme",
    "editar-jornada-dt",
    "editar-os10",
    "editar-contacto-laboral",
    "cambiar-pago",
  ],
  () => import("./hoja-laboral").then((m) => m.HojaLaboral),
);
