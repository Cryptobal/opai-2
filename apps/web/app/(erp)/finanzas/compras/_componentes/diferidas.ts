"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas del libro de compras: se descargan al abrirse (ADR-037).
export const HojaCompra = hojaDiferida(["nuevo"], () =>
  import("./hoja-compra").then((m) => m.HojaCompra),
);
export const HojaLote = hojaDiferida(["lote"], () =>
  import("./hoja-lote").then((m) => m.HojaLote),
);
export const HojaRcv = hojaDiferida(["rcv"], () =>
  import("./hoja-rcv").then((m) => m.HojaRcv),
);
export const HojaSii = hojaDiferida(["sii"], () =>
  import("./hoja-sii").then((m) => m.HojaSii),
);
