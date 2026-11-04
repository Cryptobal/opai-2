"use client";

import { AccionesConversacion } from "./acciones-conversacion";
import type { useAgente } from "./use-agente";
import type { useHistorial } from "./use-historial";

/** Menú ⋯ de la conversación abierta en el panel: cambiar título, archivar y borrar. */
export function MenuDelHilo({
  a,
  h,
}: {
  a: ReturnType<typeof useAgente>;
  h: ReturnType<typeof useHistorial>;
}) {
  const id = a.conversacionId;
  if (!id || !a.meta) return null;
  return (
    <AccionesConversacion
      titulo={a.meta.titulo}
      archivada={a.meta.archivada}
      onRenombrar={async (titulo) => {
        const ok = await h.renombrar(id, titulo);
        if (ok) a.setMeta((m) => (m ? { ...m, titulo } : m));
        return ok;
      }}
      onArchivar={async (archivar) => {
        const ok = await h.archivar(id, archivar);
        if (ok) a.setMeta((m) => (m ? { ...m, archivada: archivar } : m));
        return ok;
      }}
      onBorrar={async () => {
        const ok = await h.borrar(id);
        if (ok) a.nueva();
        return ok;
      }}
    />
  );
}
