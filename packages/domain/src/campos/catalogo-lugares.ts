import { TODAS } from "./grupos";
import type { CampoDef } from "./tipos";

/** Instalación del cliente. Dentro de `{{#cada instalaciones}}` toma cada elemento. */
export const CAMPOS_INSTALACION: readonly CampoDef[] = [
  {
    clave: "instalacion.nombre",
    descripcion: "Nombre de la instalación",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "Planta Ficticia Norte",
  },
  {
    clave: "instalacion.direccion",
    descripcion: "Dirección formateada de la instalación",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "Av. Ejemplo 1234, Quilicura, Región Metropolitana",
  },
  {
    clave: "instalacion.comuna",
    descripcion: "Comuna de la instalación",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "Quilicura",
  },
  {
    clave: "instalacion.region",
    descripcion: "Región de la instalación",
    tipo: "texto",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: TODAS,
    ejemplo: "Región Metropolitana",
  },
  {
    clave: "instalacion.mapa_url",
    descripcion: "Enlace a Google Maps de la instalación",
    tipo: "url",
    fuente: "maestros",
    sensibilidad: "publica",
    finalidades: ["propuesta", "documento", "correo"],
    ejemplo: "https://maps.example.test/?q=planta-ficticia",
  },
];
