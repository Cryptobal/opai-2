export type MetaAccionesCpq = {
  avisoRecalculo?: unknown;
  puedeEnviar?: boolean;
  puedeAprobarMargen?: boolean;
  motivoNoAprobarMargen?: string | null;
};

export function accionPrimariaCpq(p: {
  version: { estado: string };
  calculo: { requiereAprobacion?: boolean; noEnviable?: boolean };
  meta?: MetaAccionesCpq;
  gestionar: boolean;
}):
  | { id: "aprobar" | "enviar" | "pedir" | "recalcular" | "lista" | "preview"; etiqueta: string; variant?: "secondary" }
  | null {
  const { version, calculo, meta, gestionar } = p;
  if (version.estado === "en_aprobacion") return null;
  if (gestionar && meta?.avisoRecalculo) return { id: "recalcular", etiqueta: "Recalcular", variant: "secondary" };
  if (gestionar && version.estado === "borrador" && calculo.requiereAprobacion)
    return { id: "pedir", etiqueta: "Pedir aprobación" };
  if (gestionar && meta?.puedeEnviar) return { id: "enviar", etiqueta: "Enviar al contacto" };
  if (gestionar && version.estado === "borrador" && !calculo.requiereAprobacion && !calculo.noEnviable)
    return { id: "lista", etiqueta: "Dejar lista", variant: "secondary" };
  return { id: "preview", etiqueta: "Vista previa PDF", variant: "secondary" };
}
