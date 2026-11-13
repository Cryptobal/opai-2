import { z } from "zod";
import { AREAS_NAV, MAXIMO_FIJADOS } from "@opai/domain";

const fijadoSchema = z.object({
  tipo: z.enum(["entrada", "ficha"]),
  href: z.string().min(1).max(200).regex(/^\/(?!\/)[^\\\s]*$/, "Usa una ruta interna"),
  etiqueta: z.string().min(1).max(80),
  fijadoEn: z.iso.datetime(),
});

/** Vista guardada de una lista (CAR-335 D4c): nombre y filtros de la URL, sin la ficha abierta. */
const vistaSchema = z.object({
  nombre: z.string().trim().min(1).max(40),
  query: z.string().max(400).regex(/^(\?[^\s#]*)?$/, "Usa solo filtros de la URL"),
});
export const MAXIMO_VISTAS = 10;
const vistasSchema = z
  .record(z.string().regex(/^[a-z0-9_-]{1,40}$/), z.array(vistaSchema).max(MAXIMO_VISTAS))
  .refine((r) => Object.keys(r).length <= 60, "Demasiadas listas")
  .refine(
    (r) => Object.values(r).every((v) => new Set(v.map((x) => x.nombre)).size === v.length),
    "No repitas el nombre de una vista",
  );

/** Preferencias por usuario y tenant (Brief 05), sin tablas nuevas. */
export const ajustesNavegacion = {
  navegacion_area_principal: z.enum(AREAS_NAV).nullable().default(null).meta({
    etiqueta: "Área principal", ayuda: "Qué área ocupa la barra inferior del teléfono. Vacío: la de por defecto del rol.",
    grupo: "Navegación", ambito: "usuario", control: "seleccion",
  }),
  navegacion_area_abierta: z.enum([...AREAS_NAV, "ninguna"]).nullable().default(null).meta({
    etiqueta: "Área abierta en la barra lateral", ayuda: "Qué grupo queda abierto en el acordeón (D1); las demás se pliegan.",
    grupo: "Navegación", ambito: "usuario", control: "seleccion",
  }),
  navegacion_fijados: z.array(fijadoSchema).max(MAXIMO_FIJADOS)
    .refine((items) => new Set(items.map((f) => f.href)).size === items.length, "No repitas un fijado")
    .default([]).meta({ etiqueta: "Fijados", ayuda: "Hasta cinco entradas o fichas, arriba de la barra lateral (D3).",
      grupo: "Navegación", ambito: "usuario", control: "json" }),
  navegacion_vistas_guardadas: vistasSchema.default({}).meta({
    etiqueta: "Vistas guardadas", ayuda: "Filtros con nombre de cada lista, de cada persona (D4c). Hasta 10 por lista.",
    grupo: "Navegación", ambito: "usuario", control: "json" }),
};
