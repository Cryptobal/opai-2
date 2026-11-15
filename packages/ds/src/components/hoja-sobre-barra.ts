"use client";

import { createContext, useContext } from "react";

/**
 * Hoja de pestaña del teléfono en el diseño nuevo (CAR-416, `export-diseno-nuevo/Telefono`): la
 * barra inferior se ve siempre, así que la hoja ocupa la pantalla de arriba a la barra, no es modal
 * y se cierra al tocar otra pestaña. La da `BarraInferiorNueva`; fuera de ella vale `false`.
 */
export const HojaSobreBarra = createContext(false);

export const useHojaSobreBarra = () => useContext(HojaSobreBarra);

/** Evento que avisa que se tocó una pestaña de la barra inferior (el panel del agente se cierra). */
export const EVENTO_PESTANA_BARRA = "opai:pestana-barra";

/** Marca del disparador de la pestaña «Menú»: tocarlo con la hoja abierta la cierra, no la reabre. */
export const ATRIBUTO_DISPARADOR = "data-pestana-menu";
