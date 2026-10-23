import type { CampoAjusteVista } from "@opai/ds";

/** Esquema de ejemplo de una sección de módulo ("Operaciones"). */
export const CAMPOS: CampoAjusteVista[] = [
  {
    modulo: "ops",
    clave: "tolerancia",
    etiqueta: "Minutos de tolerancia",
    ayuda: "Por defecto 10",
    grupo: "Alertas",
    ambito: "tenant",
    control: "numero",
    editable: true,
    esquema: { type: "integer" },
  },
  {
    modulo: "ops",
    clave: "retencion",
    etiqueta: "Retención de auditoría",
    ayuda: null,
    grupo: "Alertas",
    ambito: "plataforma",
    control: null,
    editable: false,
    esquema: { type: "string" },
  },
  {
    modulo: "ops",
    clave: "te",
    etiqueta: "Permitir turnos extra sin aprobación",
    ayuda: null,
    grupo: "General",
    ambito: "tenant",
    control: "switch",
    editable: true,
    esquema: { type: "boolean" },
  },
];
