import { z } from "zod";

import { PERMISOS_CORE, TIPOS_AUSENCIA_BASE } from "@opai/domain";

import { defineAjustes } from "./registro";

/**
 * Ajustes de Personas, en Configuración › Módulos › Personas. El plazo máximo de vigencia de la
 * marca P1 "No recontratar" (corrección del abogado, 30-oct 15:33 CLT) queda configurable pero SIN
 * valor de negocio decidido: 0 = sin tope, y la capacidad no lo exige todavía. TODO(decisión Carlos):
 * fijar el plazo máximo (o confirmar que no lo hay) antes de aplicarlo como validación.
 */
const pasosProceso = (etiqueta: string, ayuda: string) =>
  z
    .array(
      z.object({
        titulo: z.string().trim().min(3).max(120),
        plazoDias: z.number().int().min(-30).max(90),
      }),
    )
    .max(30)
    .default([])
    .meta({
      etiqueta,
      ayuda,
      grupo: "Personas",
      ambito: "tenant",
      permiso: PERMISOS_CORE.vinculosManage,
      soloPersonas: true,
      control: "json",
    });

export const AJUSTES_PERSONAS = defineAjustes(
  "core",
  z.object({
    // CAR-355: pasos de ingreso y salida. Vacío = los de la vertical de la empresa (@opai/domain).
    personas_pasos_ingreso: pasosProceso(
      "Pasos de ingreso de una persona",
      'Se abren al crear un vínculo. Vacío: los de tu rubro. Ej.: [{ "titulo": "Firmar contrato", "plazoDias": 15 }]. El plazo cuenta desde el inicio.',
    ),
    personas_pasos_salida: pasosProceso(
      "Pasos de salida de una persona",
      'Se abren al terminar el último vínculo. Vacío: los de tu rubro. Ej.: [{ "titulo": "Firmar finiquito", "plazoDias": 10 }]. El plazo cuenta desde el término.',
    ),
    // CAR-393 parte 3: clases de ausencia. Vacío = las de la vertical de la empresa (@opai/domain).
    personas_clases_ausencia: z
      .array(
        z.object({ nombre: z.string().trim().min(3).max(80), tipo: z.enum(TIPOS_AUSENCIA_BASE) }),
      )
      .max(40)
      .refine(
        (xs) => new Set(xs.map((x) => x.nombre.toLocaleLowerCase("es"))).size === xs.length,
        "Hay clases con el mismo nombre.",
      )
      .default([])
      .meta({
        etiqueta: "Clases de permisos, licencias y vacaciones",
        ayuda:
          'Se eligen al registrar una ausencia. Cada clase cuenta como uno de los tipos base (ausencia, licencia, vacaciones o permiso). Vacío: las de tu rubro. Ej.: [{ "nombre": "Licencia mutual", "tipo": "licencia" }].',
        grupo: "Personas",
        ambito: "tenant",
        permiso: PERMISOS_CORE.personasLaboralManage,
        soloPersonas: true,
        control: "json",
      }),
    // CAR-408: prendas del uniforme cuyas tallas guarda la ficha. Vacío = las de la vertical (@opai/domain).
    personas_prendas_uniforme: z
      .array(z.object({ nombre: z.string().trim().min(2).max(60) }))
      .max(30)
      .default([])
      .meta({
        etiqueta: "Prendas del uniforme",
        ayuda:
          'La ficha pide la talla de cada prenda. Vacío: las de tu rubro. Ej.: [{ "nombre": "Cotona" }, { "nombre": "Calzado" }]. Cambiar el nombre de una prenda la cuenta como nueva.',
        grupo: "Personas",
        ambito: "tenant",
        permiso: PERMISOS_CORE.personasLaboralManage,
        soloPersonas: true,
        control: "json",
      }),
    personas_no_recontratar_vigencia_maxima_dias: z
      .number()
      .int()
      .min(0)
      .max(36_500)
      .default(0)
      .meta({
        etiqueta: 'Plazo máximo de vigencia de la marca "No recontratar" (días)',
        ayuda:
          "TODO(decisión Carlos): sin plazo máximo definido. Con 0 no hay tope; la fecha de vencimiento la fija quien marca, por persona.",
        grupo: "Personas",
        ambito: "tenant",
        permiso: PERMISOS_CORE.personasNoRecontratarManage,
        soloPersonas: true,
        control: "numero",
      }),
  }),
);
