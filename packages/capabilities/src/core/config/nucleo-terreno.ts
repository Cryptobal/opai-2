import { z } from "zod";

import {
  PERMISOS_CORE,
  PIN_BLOQUEO_MINUTOS_DEFECTO,
  PIN_INTENTOS_MAXIMOS_DEFECTO,
} from "@opai/domain";

import { defineAjustes } from "./registro";

/**
 * Bloqueo del PIN de terreno (CAR-78 · B1, D-02): intentos fallidos antes de pausar la credencial y
 * minutos de pausa. Los lee el ingreso (`@opai/auth`, `pin.ts`) con estos mismos límites.
 */
export const AJUSTES_TERRENO = defineAjustes(
  "core",
  z.object({
    terreno_pin_intentos_maximos: z
      .number()
      .int()
      .min(3)
      .max(10)
      .default(PIN_INTENTOS_MAXIMOS_DEFECTO)
      .meta({
        etiqueta: "Intentos fallidos del PIN antes del bloqueo",
        ayuda: "Tras estos intentos incorrectos seguidos, el PIN de terreno queda pausado.",
        grupo: "Terreno",
        ambito: "tenant",
        permiso: PERMISOS_CORE.personasManage,
        control: "numero",
      }),
    terreno_pin_bloqueo_minutos: z
      .number()
      .int()
      .min(5)
      .max(1440)
      .default(PIN_BLOQUEO_MINUTOS_DEFECTO)
      .meta({
        etiqueta: "Minutos de bloqueo del PIN",
        ayuda: "Cuánto tiempo queda pausado el PIN de terreno tras superar los intentos.",
        grupo: "Terreno",
        ambito: "tenant",
        permiso: PERMISOS_CORE.personasManage,
        control: "numero",
      }),
    biometria_umbral_similitud: z.number().min(70).max(99.9).default(90).meta({
      etiqueta: "Umbral de similitud facial (0 a 100)",
      ayuda:
        "Similitud mínima para aceptar un rostro al marcar. Lo fija la plataforma, no cada empresa (T-03). Un valor fuera de rango cae al defecto.",
      grupo: "Biometría",
      ambito: "plataforma",
      control: "numero",
    }),
    biometria_empresas_reales: z.boolean().default(false).meta({
      etiqueta: "Permitir Face ID en empresas reales",
      ayuda:
        "Apagado: solo las empresas de prueba (slug «qa-…») usan un proveedor real de rostro. Se enciende solo cuando Carlos confirma la evaluación de impacto y el DPA (Ley 21.719, datos biométricos sensibles desde el 1-dic-2026).",
      grupo: "Biometría",
      ambito: "plataforma",
      control: "switch",
    }),
  }),
);
