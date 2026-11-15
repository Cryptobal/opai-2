/** Filas de Actividad (lo que pasó en la empresa), separadas de `tipos-maestros.ts` por su largo. */
export type Actividad = {
  items: {
    id: string;
    cuando: string;
    capability: string;
    actor: { tipo: string; nombre: string; agente: boolean };
    via: string | null;
    accion: string;
    cambios: { campo: string; valor: string }[];
    detalle: unknown;
    entidad?: { tipo: string; id: string } | null;
  }[];
  siguiente: string | null;
};
