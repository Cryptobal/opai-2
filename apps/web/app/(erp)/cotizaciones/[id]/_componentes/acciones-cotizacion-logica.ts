import { avisosDesdeCalculo, mensajeFaltantesRecalcular } from "@/lib/cpq-presentacion";

export type MetaAccionesCpq = {
  avisoRecalculo?: unknown;
  puedeEnviar?: boolean;
  puedeAprobarMargen?: boolean;
  motivoNoAprobarMargen?: string | null;
};

export type AccionPrimariaCpq = {
  id: "enviar" | "pedir" | "recalcular" | "lista" | "preview";
  etiqueta: string;
  variant?: "secondary";
};

/** Props de `BloqueoCotizacion` (CAR-150 #226), derivadas del cálculo. */
export type BloqueoEnvioCpq = {
  mensaje: string;
  laboralPendiente: boolean;
  enlace?: { href: string; etiqueta: string };
};

type ParamsAcciones = {
  version: { estado: string };
  calculo: { requiereAprobacion?: boolean; noEnviable?: boolean; advertencias?: string[] };
  meta?: MetaAccionesCpq;
  gestionar: boolean;
};

function esBloqueoLaboral(advertencias: string[]): boolean {
  return advertencias.some(
    (a) =>
      a.toLowerCase().includes("costo laboral") ||
      a.includes("motor de sueldos") ||
      a.includes("valores legales") ||
      a.includes("mutual adicional") ||
      a.includes("falta valor UF"),
  );
}

function mensajeBloqueo(advertencias: string[]): string {
  const avisos = avisosDesdeCalculo(advertencias);
  const resumen = mensajeFaltantesRecalcular(advertencias);
  if (resumen) return resumen;
  const primero = avisos[0];
  if (primero) return primero.detalle ?? primero.titulo;
  const uf = advertencias.find((a) => a.includes("UF"));
  return (
    uf ??
    "Hay datos pendientes para calcular la cotización. Recalcula o completa lo que falta."
  );
}

/** Bloqueo alineado a `solicitar_aprobacion` / `marcar_lista` cuando `noEnviable`. */
export function bloqueoEnvioCpq(p: ParamsAcciones): BloqueoEnvioCpq | null {
  const { version, calculo, gestionar } = p;
  if (!gestionar || version.estado !== "borrador" || !calculo.noEnviable) return null;
  const advertencias = calculo.advertencias ?? [];
  const avisos = avisosDesdeCalculo(advertencias);
  const primero = avisos[0];
  const laboralPendiente =
    esBloqueoLaboral(advertencias) && !advertencias.some((a) => a.includes("sueldo base"));

  if (laboralPendiente) {
    return {
      mensaje: mensajeBloqueo(advertencias),
      laboralPendiente: true,
      ...(primero?.enlace ? { enlace: primero.enlace } : {}),
    };
  }

  if (primero) {
    return {
      mensaje: primero.detalle ?? primero.titulo,
      laboralPendiente: false,
      ...(primero.enlace ? { enlace: primero.enlace } : {}),
    };
  }

  return {
    mensaje: mensajeBloqueo(advertencias),
    laboralPendiente: false,
  };
}

export function accionPrimariaCpq(p: ParamsAcciones): AccionPrimariaCpq | null {
  const { version, calculo, meta, gestionar } = p;
  if (version.estado === "en_aprobacion") return null;
  if (bloqueoEnvioCpq(p)) return null;
  if (gestionar && meta?.avisoRecalculo) return { id: "recalcular", etiqueta: "Recalcular", variant: "secondary" };
  if (gestionar && version.estado === "borrador" && calculo.requiereAprobacion)
    return { id: "pedir", etiqueta: "Pedir aprobación" };
  if (gestionar && meta?.puedeEnviar) return { id: "enviar", etiqueta: "Enviar al contacto" };
  if (gestionar && version.estado === "borrador" && !calculo.requiereAprobacion)
    return { id: "lista", etiqueta: "Dejar lista", variant: "secondary" };
  return { id: "preview", etiqueta: "Vista previa PDF", variant: "secondary" };
}

export function hayBarraFijaCpq(p: ParamsAcciones): boolean {
  return Boolean(accionPrimariaCpq(p) || bloqueoEnvioCpq(p));
}

export function pedirAprobacionDeshabilitada(p: ParamsAcciones): boolean {
  return Boolean(
    p.gestionar &&
      p.version.estado === "borrador" &&
      p.calculo.requiereAprobacion &&
      bloqueoEnvioCpq(p),
  );
}

export { mensajeFaltantesRecalcular };
