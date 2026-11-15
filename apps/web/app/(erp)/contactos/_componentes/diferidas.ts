"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hoja de fusionar contactos: se descarga al abrirse (`?fusionar=1`, ADR-037).
export const HojaFusionarContacto = hojaDiferida(["fusionar"], () =>
  import("./hoja-fusionar-contacto").then((m) => m.HojaFusionarContacto),
);
