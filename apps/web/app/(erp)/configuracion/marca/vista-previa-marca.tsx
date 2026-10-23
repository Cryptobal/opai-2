"use client";

import { useState } from "react";

import { Badge, cn, SeccionTarjeta, Segmentado } from "@opai/ds";

type Props = {
  nombre: string;
  primario: string;
  secundario: string;
  logo: string | null;
  hoy: string;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Vista previa con los valores del formulario (22). Los colores son datos de la empresa, no del
 * DS: se aplican solo aquí, como estilo de la muestra.
 */
export function VistaPreviaMarca({ nombre, primario, secundario, logo, hoy }: Props) {
  const [vista, setVista] = useState("documento");
  const p = HEX.test(primario) ? primario : undefined;
  const s = HEX.test(secundario) ? secundario : undefined;
  const marca = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt={nombre} className="h-5 object-contain" />
  ) : (
    <span className="text-sm font-bold tracking-wide uppercase">{nombre || "Tu empresa"}</span>
  );
  return (
    <SeccionTarjeta
      titulo="Vista previa"
      accion={
        <Segmentado
          etiqueta="Vista previa"
          activa={vista}
          opciones={[
            { id: "documento", etiqueta: "Documento", onClick: () => setVista("documento") },
            { id: "correo", etiqueta: "Correo", onClick: () => setVista("correo") },
          ]}
        />
      }
    >
      <Badge punto={false} className="mb-3">
        Datos de ejemplo
      </Badge>
      {vista === "documento" ? (
        <div className="max-w-md rounded-md border border-border bg-surface">
          <div
            className="flex items-center justify-between border-b-2 px-4 py-3"
            style={p ? { borderColor: p } : undefined}
          >
            {marca}
            <span className="t-caption">COT-0187 · {hoy}</span>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <p className="text-sm font-semibold text-fg">
              Propuesta de servicio · Cliente de ejemplo
            </p>
            <span className="h-2 w-4/5 rounded-full bg-fill" />
            <span className="h-2 w-3/5 rounded-full bg-fill" />
          </div>
        </div>
      ) : (
        <div className="max-w-md overflow-hidden rounded-md border border-border bg-surface">
          <div
            className="bg-inverse-bg px-4 py-3 text-inverse-fg"
            style={p ? { backgroundColor: p } : undefined}
          >
            {marca}
          </div>
          <div className="flex flex-col gap-2 p-4 text-sm text-fg">
            <p className="font-semibold">Tu credencial vence en 22 días</p>
            <p className="text-fg-muted">Hola, súbela antes de la fecha de vencimiento.</p>
            <span
              className={cn(
                "self-start rounded-sm bg-fill px-3 py-1.5 font-semibold",
                s && "text-inverse-fg",
              )}
              style={s ? { backgroundColor: s } : undefined}
            >
              Subir documento
            </span>
          </div>
        </div>
      )}
    </SeccionTarjeta>
  );
}
