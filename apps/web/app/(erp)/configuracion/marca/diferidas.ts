"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

export const HojaLogo = hojaDiferida(["logo"], () => import("./hoja-logo").then((m) => m.HojaLogo));
