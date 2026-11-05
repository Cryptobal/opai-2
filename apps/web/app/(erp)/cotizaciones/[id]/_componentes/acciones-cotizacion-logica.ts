import {
  avisoEsSueldoFaltante,
  avisosCpq,
  RUTA_CONFIRMAR_MUTUAL,
  type AccionAvisoCpq,
  type AvisoServidorCpq,
} from "@/lib/cpq-avisos";
import { TEXTO_COSTO_PENDIENTE } from "@/lib/cpq-avisos-compactos";

export type MetaAccionesCpq = {
  avisoRecalculo?: unknown;
  puedeEnviar?: boolean;
  puedeAprobarMargen?: boolean;
  motivoNoAprobarMargen?: string | null;
  requiereConfirmarMutual?: boolean;
  puedeReabrir?: boolean;
  puedeCrearVersion?: boolean;
};

export type AccionPrimariaCpq = {
  id: "enviar" | "pedir" | "recalcular" | "lista" | "preview";
  etiqueta: string;
  variant?: "secondary";
};

/** Props de `BloqueoCotizacion`, derivadas de la causa concreta del cálculo (CAR-162). */
export type BloqueoEnvioCpq = {
  titulo: string;
  mensaje: string;
  /** Ofrece «Recalcular» (falta un dato que se completa fuera de la cotización). */
  recalcular: boolean;
  enlace?: { href: string; etiqueta: string };
  accion?: AccionAvisoCpq;
};

type ParamsAcciones = {
  version: { estado: string };
  calculo: {
    requiereAprobacion?: boolean;
    noEnviable?: boolean;
    advertencias?: string[];
    avisos?: AvisoServidorCpq[];
  };
  meta?: MetaAccionesCpq;
  gestionar: boolean;
};

/** Bloqueo alineado a `solicitar_aprobacion` / `marcar_lista` cuando `noEnviable`; nombra la causa. */
export function bloqueoEnvioCpq(p: ParamsAcciones): BloqueoEnvioCpq | null {
  const { version, calculo, gestionar } = p;
  if (!gestionar || version.estado !== "borrador" || !calculo.noEnviable) return null;
  const avisos = avisosCpq(calculo).filter((a) => a.bloquea);
  const primero = avisos[0];
  if (!primero) {
    return {
      titulo: "Cotización bloqueada",
      mensaje:
        "Hay datos pendientes para calcular la cotización. Recalcula o completa lo que falta.",
      recalcular: true,
    };
  }
  if (avisoEsSueldoFaltante(primero)) {
    return {
      titulo: TEXTO_COSTO_PENDIENTE,
      mensaje: "",
      recalcular: false,
    };
  }
  const mas = avisos.length > 1 ? ` (y ${avisos.length - 1} más en la ficha)` : "";
  return {
    titulo: primero.titulo,
    mensaje: `${primero.detalle ?? ""}${mas}`.trim(),
    recalcular: !primero.accion,
    ...(primero.enlace ? { enlace: primero.enlace } : {}),
    ...(primero.accion ? { accion: primero.accion } : {}),
  };
}

/** Enviar exige confirmar la mutual (misma regla que `cpq.envios_propuesta.*` en el servidor). */
export function bloqueoMutualCpq(p: ParamsAcciones): BloqueoEnvioCpq | null {
  if (!p.gestionar || !p.meta?.requiereConfirmarMutual || bloqueoEnvioCpq(p)) return null;
  if (p.version.estado !== "borrador" && p.version.estado !== "lista") return null;
  return {
    titulo: "Confirma la mutual adicional para enviar",
    mensaje:
      "La cotización se calcula con 0 % de mutual adicional. Confírmala antes de enviarla al cliente.",
    recalcular: false,
    enlace: { href: RUTA_CONFIRMAR_MUTUAL, etiqueta: "Confirmar mutual" },
  };
}

export function accionPrimariaCpq(p: ParamsAcciones): AccionPrimariaCpq | null {
  const { version, calculo, meta, gestionar } = p;
  if (version.estado === "en_aprobacion") return null;
  if (bloqueoEnvioCpq(p)) return null;
  if (gestionar && meta?.avisoRecalculo)
    return { id: "recalcular", etiqueta: "Recalcular", variant: "secondary" };
  if (gestionar && version.estado === "borrador" && calculo.requiereAprobacion)
    return { id: "pedir", etiqueta: "Pedir aprobación" };
  if (gestionar && meta?.puedeEnviar) return { id: "enviar", etiqueta: "Enviar al contacto" };
  if (gestionar && version.estado === "borrador" && !calculo.requiereAprobacion)
    return { id: "lista", etiqueta: "Dejar lista", variant: "secondary" };
  return { id: "preview", etiqueta: "Vista previa PDF", variant: "secondary" };
}

export function hayBarraFijaCpq(p: ParamsAcciones): boolean {
  const bloqueo = bloqueoEnvioCpq(p);
  if (bloqueo?.titulo === TEXTO_COSTO_PENDIENTE && !bloqueo.enlace && !bloqueo.accion) {
    return Boolean(accionPrimariaCpq(p));
  }
  return Boolean(accionPrimariaCpq(p) || bloqueo);
}

/** Bloqueo de cálculo que no debe repetirse en la barra fija del teléfono (sueldo en la línea). */
export function bloqueoCalculoEnBarraFija(p: ParamsAcciones): BloqueoEnvioCpq | null {
  const bloqueo = bloqueoEnvioCpq(p);
  if (bloqueo?.titulo === TEXTO_COSTO_PENDIENTE && !bloqueo.enlace && !bloqueo.accion) return null;
  return bloqueo;
}

export function pedirAprobacionDeshabilitada(p: ParamsAcciones): boolean {
  return Boolean(
    p.gestionar &&
    p.version.estado === "borrador" &&
    p.calculo.requiereAprobacion &&
    bloqueoEnvioCpq(p),
  );
}
