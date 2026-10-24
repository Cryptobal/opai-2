"use client";

import dynamic from "next/dynamic";

// El menú por documento (con su confirmación y acciones) se descarga aparte (ADR-037); el HTML del
// botón ya viene del servidor.
export const MenuDocumento = dynamic(() => import("./menu-documento").then((m) => m.MenuDocumento));
