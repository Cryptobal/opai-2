// Eventos comunicables del núcleo (ADR-020): variables declaradas con ejemplo y plantillas por
// defecto en código. El tenant solo guarda versiones editadas; sin regla, nada se envía, salvo los
// transaccionales, que van siempre a su destinatario directo.

export type Canal = "correo" | "inapp";
export type TipoVariable = "texto" | "fecha" | "numero" | "url";
export type VariableComunicable = {
  ruta: string;
  tipo: TipoVariable;
  ejemplo: string;
  descripcion: string;
};
export type PlantillaBase = { asunto: string; cuerpo: string };

export type EventoComunicable = {
  evento: string;
  nombre: string;
  descripcion: string;
  /** Va siempre a su destinatario directo (invitación, recuperación), sin reglas. */
  transaccional: boolean;
  variables: readonly VariableComunicable[];
  plantillas: Partial<Record<Canal, PlantillaBase>>;
};

export const v = (
  ruta: string,
  tipo: TipoVariable,
  ejemplo: string,
  descripcion: string,
): VariableComunicable => ({
  ruta,
  tipo,
  ejemplo,
  descripcion,
});

export const EMPRESA = v("empresa.nombre", "texto", "Gard Security", "Nombre de la empresa.");
export const URL = (d: string) => v("url", "url", "https://test.opai.cl/configuracion", d);
