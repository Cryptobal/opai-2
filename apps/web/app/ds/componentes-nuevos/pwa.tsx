"use client";

import { Banda, SinConexion } from "@opai/ds";

const nada = () => undefined;

/** Estados y bandas de la base PWA (ADR-044, Brief 04): sin conexión, versión nueva e instalar. */
export function MuestraPwa() {
  return (
    <div className="flex flex-col gap-4">
      <SinConexion accion={<span className="text-sm text-fg-muted">[botón Reintentar]</span>} />
      <Banda
        flotante={false}
        mensaje="Hay una versión nueva."
        accion={{ etiqueta: "Actualizar", onClick: nada }}
        onCerrar={nada}
      />
      <Banda
        flotante={false}
        mensaje="Instala OPAI en este dispositivo."
        accion={{ etiqueta: "Instalar", onClick: nada }}
        onCerrar={nada}
      />
    </div>
  );
}
