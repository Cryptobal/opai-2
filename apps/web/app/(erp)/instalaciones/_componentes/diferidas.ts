"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de instalaciones: se descargan al abrirse (ADR-037).
export const HojaInstalacion = hojaDiferida(["editar"], () =>
  import("./hoja-instalacion").then((m) => m.HojaInstalacion),
);
export const HojaPuesto = hojaDiferida(["puesto"], () =>
  import("./hoja-puesto").then((m) => m.HojaPuesto),
);
export const HojaTitular = hojaDiferida(["titular"], () =>
  import("./hoja-titular").then((m) => m.HojaTitular),
);
