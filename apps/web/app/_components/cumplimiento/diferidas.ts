"use client";

import { hojaDiferida } from "../hoja-diferida";

export const HojaSolicitud = hojaDiferida(["solicitud"], () =>
  import("./hoja-solicitud").then((m) => m.HojaSolicitud),
);
export const HojaConsentimiento = hojaDiferida(["consentimiento"], () =>
  import("./hoja-consentimiento").then((m) => m.HojaConsentimiento),
);
