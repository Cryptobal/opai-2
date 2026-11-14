import { z } from "zod";

// Ajustes del módulo Portal Cliente (ADR-018, ADR-021). Qué ve cada cliente es dato por cuenta
// (`portal_cliente.config.*`, pantalla 12); aquí solo viven los defectos del tenant. Con al menos
// un ajuste el módulo aparece en el índice de Configuración → Módulos activos, junto a su pestaña.
export const ajustesPortalCliente = z.object({
  dia_envio_informe: z.number().int().min(1).max(28).default(1).meta({
    etiqueta: "Día del mes en que el cliente recibe el informe",
    ayuda:
      "El resumen del mes es el informe mensual (B14). Lo usa el envío por correo a los destinatarios de cada cuenta (PR 2).",
    grupo: "Informe mensual",
    ambito: "tenant",
    permiso: "portal_cliente:config.manage",
    control: "numero",
  }),
  seccion_cobertura: z.boolean().default(true).meta({
    etiqueta: "Mostrar la cobertura de turnos a los clientes",
    ayuda:
      "En el resumen del mes, cada instalación muestra los turnos programados, cubiertos y por cubrir (sin nombres ni costos). Cada cuenta puede ocultarla en su configuración del portal.",
    grupo: "Secciones del portal",
    ambito: "tenant",
    permiso: "portal_cliente:config.manage",
    control: "switch",
  }),
  seccion_rondas: z.boolean().default(true).meta({
    etiqueta: "Mostrar las rondas realizadas a los clientes",
    ayuda:
      "En el resumen del mes, cada instalación muestra las rondas cerradas, cuántas quedaron completas y cuántas incompletas (sin nombres de los guardias). Cada cuenta puede ocultarla en su configuración del portal.",
    grupo: "Secciones del portal",
    ambito: "tenant",
    permiso: "portal_cliente:config.manage",
    control: "switch",
  }),
  seccion_novedades: z.boolean().default(true).meta({
    etiqueta: "Mostrar las novedades por gravedad a los clientes",
    ayuda:
      "En el resumen del mes, cada instalación muestra cuántas novedades hubo por gravedad y cuántas siguen abiertas. Solo cantidades: el texto que escribe el guardia no se muestra al cliente.",
    grupo: "Secciones del portal",
    ambito: "tenant",
    permiso: "portal_cliente:config.manage",
    control: "switch",
  }),
});
