import { notFound } from "next/navigation";

import { Badge, Card, type EstadoPantalla } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { fecha, pesos, rut } from "@/lib/fechas";

import { AccionesDeudor } from "../_componentes/acciones-deudor";
import { cargarDeudor } from "../_componentes/datos";
import { CANAL, RESULTADO } from "../_componentes/etiquetas";
import type { FichaDeudor } from "../_componentes/tipos";

export const metadata = { title: "Deudor" };

/** Ficha del deudor: facturas vencidas, contactos de facturación y gestiones (diseño pantalla 5, vista 5k/5l). */
export default async function DeudorPage({ params }: { params: Promise<{ cuentaId: string }> }) {
  const { cuentaId } = await params;
  return (
    <PaginaPortal
      portal="erp"
      titulo="Deudor"
      ruta="/finanzas/cobranza"
      volver={{ href: "/finanzas/cobranza", etiqueta: "Cobranza" }}
      cargar={() => cargarDeudor(cuentaId)}
      opciones={(d) => ({ titulo: d.ficha?.nombre ?? "Deudor" })}
    >
      {(d) => {
        if (d.state === "ready" && !d.ficha) notFound();
        return <Ficha state={d.state} ficha={d.ficha} gestiona={d.gestiona} />;
      }}
    </PaginaPortal>
  );
}

function Ficha({ state, ficha, gestiona }: { state: EstadoPantalla; ficha: FichaDeudor | null; gestiona: boolean }) {
  if (state !== "ready" || !ficha) return null;
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex flex-col gap-1">
        <p className="t-subheading text-fg">{ficha.nombre}</p>
        <p className="text-sm text-fg-muted">
          {ficha.rut ? `RUT ${rut(ficha.rut)} · ` : ""}Total vencido <span className="t-numeric text-fg">{pesos(ficha.saldoVencido)}</span>
        </p>
      </Card>
      <Card className="p-4 flex flex-col gap-3">
        <h3 className="text-sm font-medium">Facturas vencidas</h3>
        {ficha.facturas.length === 0 ? (
          <p className="text-sm text-fg-muted">Este cliente no tiene facturas vencidas.</p>
        ) : (
          <AccionesDeudor facturas={ficha.facturas} contactos={ficha.contactos} gestiona={gestiona} />
        )}
      </Card>
      <Card className="p-4 flex flex-col gap-2">
        <h3 className="text-sm font-medium">Contactos de facturación</h3>
        {ficha.contactos.length === 0 ? (
          <p className="text-sm text-fg-muted">Sin contactos con rol facturación. Agrégalos en la ficha del cliente.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {ficha.contactos.map((c, i) => (
              <li key={i} className="py-2 flex flex-col">
                <span>{c.nombre}</span>
                <span className="text-fg-muted">{[c.email, c.telefono].filter(Boolean).join(" · ") || "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="p-4 flex flex-col gap-2">
        <h3 className="text-sm font-medium">Historial de gestiones</h3>
        {ficha.gestiones.length === 0 ? (
          <p className="text-sm text-fg-muted">Aún no hay gestiones registradas.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {ficha.gestiones.map((g) => (
              <li key={g.id} className="py-2 flex items-start justify-between gap-3">
                <span className="flex flex-col">
                  <span>
                    {CANAL[g.canal]} · {g.origen === "automatico" ? `automático, paso ${g.paso ?? "—"}` : "manual"}
                  </span>
                  {g.detalle ? <span className="text-fg-muted">{g.detalle}</span> : null}
                  <span className="text-xs text-fg-muted">{fecha(g.fecha.slice(0, 10))}</span>
                </span>
                <Badge tono={RESULTADO[g.resultado]?.tono ?? "neutro"}>{RESULTADO[g.resultado]?.etiqueta ?? g.resultado}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

