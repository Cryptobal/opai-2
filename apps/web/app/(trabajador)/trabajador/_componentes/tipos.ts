import type { CATEGORIAS_AVISO } from "@opai/domain";

/** Forma de las salidas de las capacidades del portal (ver `modules/portal_trabajador/capabilities`). */
export type MisDatos = {
  personaId: string;
  nombres: string;
  apellidos: string;
  rut: string;
  emailPersonal: string | null;
  emailLaboral: string | null;
  telefono: string | null;
  calle: string | null;
  comuna: string | null;
  region: string | null;
  direccionFormateada: string | null;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
  faltantes: ("telefono" | "emailPersonal" | "direccion")[];
};

export type Preferencias = {
  preferencias: Record<(typeof CATEGORIAS_AVISO)[number], { push: boolean; correo: boolean }>;
  silencio: { desde: string; hasta: string } | null;
  personalizadas: boolean;
};

export type Privacidad = {
  dpo: { nombre: string | null; correo: string | null; telefono: string | null };
  empresa: string | null;
  datosTratados: { dato: string; finalidad: string }[];
  consentimientos: { finalidad: string; estado: "otorgado" | "revocado"; desde: string }[];
  solicitudes: { id: string; tipo: string; estado: string; recibidaEn: string; plazoEn: string | null }[];
};

export type Aviso = {
  id: string;
  titulo: string;
  cuerpo: string | null;
  enlace: string | null;
  leidaEn: string | null;
  creadaEn: string;
};

export const ETIQUETA_FALTANTE: Record<MisDatos["faltantes"][number], string> = {
  telefono: "Teléfono",
  emailPersonal: "Correo personal",
  direccion: "Dirección",
};
