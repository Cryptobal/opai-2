"use client";

import { useEffect, useState } from "react";

import { Campo, Input, InputFecha, InputMonto, Textarea } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import type { PortalRendicion } from "../tipos";
import type { ErroresGasto, Gasto } from "./gasto";

/** Aviso de duplicado (no bloquea): solo menciona rendiciones que la persona puede ver; lo resuelve la capacidad. */
function useRepetido(g: Gasto, portal: PortalRendicion, propiaId?: string) {
  const [res, setRes] = useState<{ clave: string; codigo: string | null } | null>(null);
  const monto = Number(g.monto);
  const listo = !!g.folio.trim() && !!g.proveedor.trim() && Number.isInteger(monto) && monto >= 1;
  const clave = `${g.proveedor.trim()}|${g.folio.trim()}|${monto}`;
  useEffect(() => {
    if (!listo) return;
    let vigente = true;
    const t = setTimeout(async () => {
      const r = await ejecutarCapacidad(portal, "rendiciones.duplicados.consultar", {
        gastos: [{ proveedor: g.proveedor.trim(), folio: g.folio.trim(), monto }],
        ...(propiaId ? { excluirRendicionId: propiaId } : {}),
      });
      if (vigente)
        setRes({
          clave,
          codigo: r.ok
            ? ((r.data as { repetidos: { codigoVisible: string }[] }).repetidos[0]?.codigoVisible ??
              null)
            : null,
        });
    }, 450);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [clave, listo, g.folio, g.proveedor, monto, portal, propiaId]);
  return listo && res?.clave === clave ? res.codigo : null;
}

/** Paso 2: monto, fecha (no futura), folio, proveedor y en qué se gastó. */
export function PasoDatos({
  gasto,
  onCambiar,
  errores,
  portal,
  propiaId,
}: {
  gasto: Gasto;
  onCambiar: (g: Gasto) => void;
  errores: ErroresGasto;
  portal: PortalRendicion;
  propiaId?: string;
}) {
  const repetido = useRepetido(gasto, portal, propiaId);
  const set = <K extends keyof Gasto>(k: K, v: Gasto[K]) => onCambiar({ ...gasto, [k]: v });
  const doc = gasto.tipoDocumento === "factura" ? "factura" : "boleta";
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Monto (CLP)" htmlFor="gasto-monto" error={errores.monto}>
        <InputMonto
          id="gasto-monto"
          valor={gasto.monto}
          onCambiar={(v) => set("monto", v)}
          invalido={!!errores.monto}
          placeholder="0"
        />
      </Campo>
      <Campo etiqueta="Fecha del gasto" htmlFor="gasto-fecha" error={errores.fecha}>
        <InputFecha
          id="gasto-fecha"
          valor={gasto.fecha}
          onCambiar={(v) => set("fecha", v)}
          invalido={!!errores.fecha}
        />
      </Campo>
      <Campo etiqueta={`Folio de la ${doc}`} htmlFor="gasto-folio" error={errores.folio}>
        <Input
          id="gasto-folio"
          value={gasto.folio}
          maxLength={40}
          inputMode="numeric"
          aria-invalid={!!errores.folio || undefined}
          onChange={(e) => set("folio", e.target.value)}
        />
      </Campo>
      {repetido ? (
        <p
          role="status"
          className="rounded-md bg-warning-muted px-3 py-2 text-base text-warning-fg"
        >
          <strong>
            Esta {doc} ya fue rendida en {repetido}.
          </strong>{" "}
          Puedes continuar si es otra compra; el aprobador verá el aviso.
        </p>
      ) : null}
      <Campo etiqueta="Proveedor" htmlFor="gasto-proveedor" error={errores.proveedor}>
        <Input
          id="gasto-proveedor"
          value={gasto.proveedor}
          maxLength={120}
          aria-invalid={!!errores.proveedor || undefined}
          onChange={(e) => set("proveedor", e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Descripción" htmlFor="gasto-descripcion" error={errores.descripcion}>
        <Textarea
          id="gasto-descripcion"
          value={gasto.descripcion}
          maxLength={200}
          rows={3}
          aria-invalid={!!errores.descripcion || undefined}
          onChange={(e) => set("descripcion", e.target.value)}
        />
      </Campo>
    </div>
  );
}
