import { SOLO_CONTRATO } from "./grupos";
import type { CampoDef } from "./tipos";

/**
 * Persona (trabajador). Datos personales de 07d: solo se resuelven en contratos. Que un campo sea
 * válido en un contrato no lo hace disponible en una propuesta ni en un correo (Ley 21.719).
 */
export const CAMPOS_PERSONA: readonly CampoDef[] = [
  {
    clave: "persona.nombre",
    descripcion: "Nombre completo de la persona",
    tipo: "texto",
    fuente: "personas",
    sensibilidad: "personal",
    finalidades: SOLO_CONTRATO,
    ejemplo: "Persona Ficticia Pérez",
  },
  {
    clave: "persona.rut",
    descripcion: "RUT de la persona",
    tipo: "texto",
    fuente: "personas",
    sensibilidad: "sensible",
    finalidades: SOLO_CONTRATO,
    ejemplo: "12.345.678-5",
  },
  {
    clave: "persona.email_laboral",
    descripcion: "Correo laboral de la persona",
    tipo: "texto",
    fuente: "personas",
    sensibilidad: "personal",
    finalidades: SOLO_CONTRATO,
    ejemplo: "persona@empresa-ficticia.test",
  },
];
