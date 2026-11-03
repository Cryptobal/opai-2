import { Search } from "lucide-react";

import { textoFaltan, type RequisitoFacturar } from "@opai/domain";
import { Badge, SeccionTarjeta } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

type Facturar = { lista: boolean; faltan: RequisitoFacturar[] };

/**
 * «Datos tributarios» del Resumen (CuentaV2 · sii): indicador «Lista para facturar» o lo que falta,
 * y «Consultar SII», que abre la hoja `?sii=1`. El indicador sale de `core.cuentas.facturable`
 * (no llama al SII); sin RUT, el botón no aparece.
 */
export async function FacturarCuenta({ c }: { c: CuentaDetalle }) {
  const r = await ejecutarComoUsuario<Facturar>("erp", "core.cuentas.facturable", { id: c.id });
  const f = r.ok ? r.data : null;
  return (
    <SeccionTarjeta
      titulo="Datos tributarios"
      accion={
        c.rut ? (
          <EnlaceBotonHoja href="?sii=1" variante="secondary" icono={Search}>
            Consultar SII
          </EnlaceBotonHoja>
        ) : undefined
      }
    >
      {f ? (
        <div className="flex flex-col gap-1">
          <Badge tono={f.lista ? "success" : "warning"} className="self-start">
            {f.lista ? "Lista para facturar" : `Faltan ${f.faltan.length} datos para facturar`}
          </Badge>
          {f.lista ? null : <p className="t-caption">{textoFaltan(f.faltan)}</p>}
          {c.rut ? null : (
            <p className="t-caption">Agrega el RUT en «Editar» para traer los datos del SII.</p>
          )}
        </div>
      ) : (
        <p className="t-caption">No se pudo calcular si la cuenta está lista para facturar.</p>
      )}
    </SeccionTarjeta>
  );
}
