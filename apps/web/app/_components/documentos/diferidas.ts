"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Subida y vista previa de documentos: se descargan al abrirse (ADR-037).
export const HojaSubir = hojaDiferida(["subir"], () =>
  import("./hoja-subir").then((m) => m.HojaSubir),
);
export const VistaPrevia = hojaDiferida(["ver"], () =>
  import("./vista-previa").then((m) => m.VistaPrevia),
);
export const HojaEnviarFirma = hojaDiferida(["firmar"], () =>
  import("./hoja-enviar-firma").then((m) => m.HojaEnviarFirma),
);
