"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de Negocios: se descargan al abrirse por su parámetro (ADR-037).
export const HojaNuevo = hojaDiferida(["nuevo"], () =>
  import("./hoja-nuevo").then((m) => m.HojaNuevo),
);
export const HojaEditar = hojaDiferida(["editar"], () =>
  import("./hoja-editar").then((m) => m.HojaEditar),
);
export const HojaMover = hojaDiferida(["mover"], () =>
  import("./hoja-mover").then((m) => m.HojaMover),
);
export const HojaGanar = hojaDiferida(["ganar"], () =>
  import("./hoja-ganar").then((m) => m.HojaGanar),
);
export const HojaPerder = hojaDiferida(["perder"], () =>
  import("./hoja-perder").then((m) => m.HojaPerder),
);
export const HojaReabrir = hojaDiferida(["reabrir"], () =>
  import("./hoja-reabrir").then((m) => m.HojaReabrir),
);
export const HojaInstalaciones = hojaDiferida(["instalaciones"], () =>
  import("./hoja-instalaciones").then((m) => m.HojaInstalaciones),
);
export const HojaContactos = hojaDiferida(["contactos"], () =>
  import("./hoja-contactos").then((m) => m.HojaContactos),
);
