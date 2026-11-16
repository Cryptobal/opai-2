"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { VistaPreviaCpqPlantilla } from "./vista-previa-cpq-plantilla";

export type PlantillaHtmlFila = { id: string; nombre: string; version: number; estado: string; tokensUsados: string[]; createdAt: string };

/** Versiones importadas: una sola en uso por empresa; sin ninguna, la propuesta usa el formato actual. */
export function ListaPlantillasHtml({ plantillas }: { plantillas: PlantillaHtmlFila[] }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [vistaId, setVistaId] = useState<string | null>(null);

  function verPrevia(id: string) {
    setVistaId((actual) => (actual === id ? null : id));
  }
  async function activar(p: PlantillaHtmlFila, activa: boolean) {
    const r = await ejecutar("cpq.propuestas_html.activar", { id: p.id, activa }, false, "layout", `html-activar-${crypto.randomUUID()}`);
    if (r) avisar.exito(activa ? `«${p.nombre}» v${p.version} en uso` : "Plantilla desactivada: rige el formato actual");
  }
  if (plantillas.length === 0) {
    return <p className="t-caption text-fg-muted">Aún no hay plantillas HTML: la propuesta usa el formato actual.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <ul aria-label="Plantillas HTML" className="divide-y divide-border rounded-md border border-border">
        {plantillas.map((p) => {
          const enUso = p.estado === "activa";
          const etiqueta = `${p.nombre} v${p.version}`;
          return (
            <li key={p.id} aria-label={etiqueta} className="flex flex-col gap-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="t-body font-medium">{etiqueta}</span>
                <Badge tono={enUso ? "success" : "neutro"}>{enUso ? "En uso" : "Inactiva"}</Badge>
                <span className="t-caption text-fg-muted">{p.tokensUsados.length} marcadores</span>
                <div className="ml-auto flex gap-2">
                  <Button variant="ghost" onClick={() => verPrevia(p.id)} disabled={pendiente} aria-expanded={vistaId === p.id}>
                    Vista previa
                  </Button>
                  <Button variant="secondary" onClick={() => activar(p, !enUso)} disabled={pendiente}>
                    {enUso ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
              {vistaId === p.id ? (
                <VistaPreviaCpqPlantilla plantillaId={p.id} titulo={`Vista previa de ${etiqueta}`} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
