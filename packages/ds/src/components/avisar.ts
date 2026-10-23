"use client";

type Accion = { etiqueta: string; onClick: () => void };
type Tipo = "success" | "error" | "info";

/**
 * Muestra un aviso cargando sonner al primer uso: las islas que solo avisan no lo llevan en su
 * JavaScript inicial (ADR-037). El `Toaster` del layout comparte la misma instancia del módulo.
 */
function mostrar(tipo: Tipo, texto: string, accion?: Accion) {
  void import("sonner").then(({ toast }) =>
    toast[tipo](
      texto,
      accion ? { action: { label: accion.etiqueta, onClick: accion.onClick } } : {},
    ),
  );
}

/** Avisos de acciones: éxito, error (con "Reintentar") o información. */
export const avisar = {
  exito: (texto: string, accion?: Accion) => mostrar("success", texto, accion),
  error: (texto: string, accion?: Accion) => mostrar("error", texto, accion),
  info: (texto: string, accion?: Accion) => mostrar("info", texto, accion),
};
