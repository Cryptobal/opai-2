import { SIN_PROPUESTA, TODAS } from "./grupos";
import type { CampoDef } from "./tipos";

/** Negocio comercial. Sin montos: el dinero sale de la cotización (CPQ), nunca del negocio ni de una IA. */
export const CAMPOS_NEGOCIO: readonly CampoDef[] = [
  {
    clave: "negocio.titulo",
    descripcion: "Título del negocio",
    tipo: "texto",
    fuente: "comercial",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "Guardias para planta norte",
  },
  {
    clave: "negocio.inicio_servicio",
    descripcion: "Inicio de servicio estimado",
    tipo: "fecha",
    fuente: "comercial",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "2026-12-01",
  },
  {
    clave: "negocio.cierre_estimado",
    descripcion: "Cierre estimado del negocio",
    tipo: "fecha",
    fuente: "comercial",
    sensibilidad: "interna",
    finalidades: SIN_PROPUESTA,
    ejemplo: "2026-11-30",
  },
];

/** Cotización de CPQ: única fuente de precios, vigencia y condiciones económicas. */
export const CAMPOS_COTIZACION: readonly CampoDef[] = [
  {
    clave: "cotizacion.codigo",
    descripcion: "Código de la cotización",
    tipo: "texto",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "CPQ-2026-001",
  },
  {
    clave: "cotizacion.titulo",
    descripcion: "Título de la cotización",
    tipo: "texto",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "Servicio de guardias",
  },
  {
    clave: "cotizacion.version",
    descripcion: "Número de versión enviada",
    tipo: "numero",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "1",
  },
  {
    clave: "cotizacion.valida_hasta",
    descripcion: "Fecha hasta la que vale la cotización",
    tipo: "fecha",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "2026-12-15",
  },
  {
    clave: "cotizacion.venta_mensual",
    descripcion: "Venta mensual neta (CLP)",
    tipo: "clp",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "4500000",
  },
  {
    clave: "cotizacion.meses_contrato",
    descripcion: "Meses de contrato",
    tipo: "numero",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "12",
  },
  {
    clave: "cotizacion.fecha_envio",
    descripcion: "Fecha de envío al cliente",
    tipo: "fecha",
    fuente: "cpq",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "2026-11-20",
  },
];
