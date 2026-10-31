import { z } from "zod";

import { defineModule } from "@opai/capabilities";

import { capacidades } from "./capacidades";
import {
  PERMISO_CERRAR,
  PERMISO_CONFIGURAR,
  PERMISO_GESTIONAR,
  PERMISO_VER,
} from "./capacidades/permisos";

/**
 * Manifest del módulo Finanzas · Flujo de caja (CAR-91, Brief 20, ADR-026). Planilla por semana con
 * capa Plan editable, cierre semanal contra el banco y ajustes. Las capas Real y Comprometido se
 * derivarán de hechos (DTE, banco, nómina) cuando esos módulos existan.
 */
export const manifest = defineModule({
  id: "finanzas",
  nombre: "Finanzas",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: PERMISO_VER, descripcion: "Ver la planilla del flujo de caja" },
    { id: PERMISO_GESTIONAR, descripcion: "Fijar, mover y dar por cumplidas las celdas del flujo" },
    { id: PERMISO_CERRAR, descripcion: "Sellar y reabrir semanas del flujo" },
    { id: PERMISO_CONFIGURAR, descripcion: "Configurar filas, saldo inicial y umbral del flujo" },
  ],
  navegacion: [
    {
      portal: "erp",
      area: "finanzas",
      href: "/finanzas/flujo",
      etiqueta: "Flujo de caja",
      icono: "ChartLine",
      orden: 10,
      permiso: PERMISO_VER,
    },
  ],
  configuracion: z.object({}),
  eventos: [
    { id: "finanzas.flujo.fila_creada", descripcion: "Se creó una fila del flujo de caja." },
    { id: "finanzas.flujo.fila_actualizada", descripcion: "Se cambió una fila del flujo de caja." },
    { id: "finanzas.flujo.celda_fijada", descripcion: "Se fijó la cifra de una celda del flujo." },
    {
      id: "finanzas.flujo.celdas_movidas",
      descripcion: "Se reprogramaron celdas de una fila del flujo.",
    },
    {
      id: "finanzas.flujo.celda_cumplida",
      descripcion: "Se dio por cumplida una celda del flujo.",
    },
    { id: "finanzas.flujo.semana_sellada", descripcion: "Se selló una semana del flujo." },
    {
      id: "finanzas.flujo.semana_reabierta",
      descripcion: "Se reabrió una semana sellada del flujo.",
    },
    {
      id: "finanzas.flujo.ajustes_cambiados",
      descripcion: "Cambiaron el saldo inicial o el umbral del flujo.",
    },
  ],
  capacidades,
});
