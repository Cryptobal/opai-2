"use client";
import { hojaDiferida } from "../hoja-diferida";
export const HojaCapaDiferida = hojaDiferida(["capa", "excepcion"], () => import("./hoja-capa").then((m) => m.HojaCapa));
