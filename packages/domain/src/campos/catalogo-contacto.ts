import { TODAS, SIN_PROPUESTA } from "./grupos";
import type { CampoDef } from "./tipos";

/** Contacto del cliente (destinatario o firmante). */
export const CAMPOS_CONTACTO: readonly CampoDef[] = [
  {
    clave: "contacto.nombre",
    descripcion: "Nombre del contacto",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "personal",
    finalidades: TODAS,
    ejemplo: "Contacto Ficticio",
  },
  {
    clave: "contacto.cargo",
    descripcion: "Cargo del contacto",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "personal",
    finalidades: TODAS,
    ejemplo: "Gerente de Operaciones",
  },
  {
    clave: "contacto.email",
    descripcion: "Correo del contacto",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "personal",
    finalidades: SIN_PROPUESTA,
    ejemplo: "contacto@cliente-ficticio.test",
  },
  {
    clave: "contacto.telefono",
    descripcion: "Teléfono del contacto",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "personal",
    finalidades: SIN_PROPUESTA,
    ejemplo: "+56 9 0000 0000",
  },
];
