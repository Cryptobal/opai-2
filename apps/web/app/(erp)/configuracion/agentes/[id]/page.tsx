import { Badge, BarraProgreso, Button, tonoUso } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type ApiKeyDetalle, gastoDelMes, usd } from "../datos";
import { estadoKey } from "../tarjeta-key";
import { FormAgente } from "./form-agente";

export const metadata = { title: "Agente" };

const GUARDAR = (
  <Button type="submit" form="form-agente">
    Guardar
  </Button>
);

/** Ficha de un agente (25): presupuesto mensual, autonomía por acción irreversible y revocar. */
export default function Agente({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Agente"
      ruta="/configuracion"
      cargando="detalle"
      volver={{ href: "/configuracion/agentes", etiqueta: "Agentes" }}
      acciones={GUARDAR}
      accionesTelefono={GUARDAR}
      cargar={async () => {
        const { id } = await params;
        const [r, gasto] = await Promise.all([
          ejecutarComoUsuario<ApiKeyDetalle>("erp", "core.apikeys.get", { id }),
          gastoDelMes(),
        ]);
        return {
          state: estadoPantalla(r),
          k: r.ok ? r.data : null,
          gasto: r.ok ? (gasto.get(id) ?? 0) : 0,
        };
      }}
      opciones={(d) => ({ titulo: d.k?.nombre ?? "Agente" })}
    >
      {({ k, gasto }) => {
        if (!k) return <Badge tono="danger">No encontramos esta key</Badge>;
        const uso = k.presupuestoMensualUsd ? gasto / k.presupuestoMensualUsd : 0;
        return (
          <div className="flex max-w-[720px] flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span>{estadoKey(k, uso)}</span>
              <h2 className="t-heading text-fg">{k.nombre}</h2>
              <p className="text-base text-fg-muted">
                <span className="t-mono">{k.prefijo}…</span> · {k.responsable.nombre}
              </p>
            </div>
            <FormAgente
              k={k}
              barra={
                <>
                  <BarraProgreso
                    valor={uso}
                    tono={tonoUso(uso)}
                    etiqueta="Presupuesto usado este mes"
                  />
                  <p className="t-caption mt-1.5">
                    {usd(gasto)} usados este mes
                    {k.presupuestoMensualUsd ? ` (${Math.round(uso * 100)} %)` : ""}
                  </p>
                </>
              }
            />
          </div>
        );
      }}
    </PaginaPortal>
  );
}
