import Link from "next/link";

import { Alerta, cn } from "@opai/ds";

import { BotonGenerarEntidad } from "./boton-generar-entidad";
import type { VistaRellenoEntidad } from "./tipos";

const ETIQUETA = { cuenta: "Cuenta", instalacion: "Instalación" } as const;

/** Vista previa del documento con los datos de la cuenta o la instalación; lo que falta se señala en ámbar. */
export function VistaEntidad({ vista, fichaHref, documentosHref }: { vista: VistaRellenoEntidad; fichaHref: string; documentosHref: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {vista.faltantes.length > 0 ? (
          <Alerta tono="warning" titulo={vista.faltantes.length === 1 ? `Falta un dato: ${vista.faltantes[0]?.etiqueta ?? ""}` : `Faltan ${vista.faltantes.length} datos`}>
            <ul className="mt-1 flex flex-col gap-1">
              {vista.faltantes.map((f) => (
                <li key={f.clave}>
                  <span className="font-medium">{f.etiqueta}:</span> {f.motivo}
                </li>
              ))}
            </ul>
            <Link href={fichaHref} className="mt-2 inline-block underline">
              Abrir la ficha
            </Link>
          </Alerta>
        ) : (
          <Alerta tono="success" titulo="Documento completo">
            Todos los datos están en la ficha. Puedes generar el PDF.
          </Alerta>
        )}
        <BotonGenerarEntidad plantillaId={vista.plantilla.id} entidadId={vista.entidad.id} documentosHref={documentosHref} puedeGenerar={vista.puedeGenerar} />
        <dl className="t-body-sm flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">{ETIQUETA[vista.entidad.tipo]}</dt>
            <dd>{vista.entidad.nombre}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">Plantilla</dt>
            <dd>
              {vista.plantilla.nombre} · versión {vista.plantilla.version}
            </dd>
          </div>
        </dl>
      </div>
      <article className="flex min-w-0 flex-col gap-3 rounded-sm border border-paper-rule bg-paper px-4 py-4 text-paper-fg md:px-9 md:py-8">
        <h2 className="t-label text-center">{vista.plantilla.nombre}</h2>
        {vista.parrafos.map((p, i) => (
          <p key={i} className="t-body-sm whitespace-pre-line text-pretty leading-6">
            {p.map((s, j) =>
              s.faltante ? (
                <span key={j} className="t-overline t-mono rounded-sm bg-warning-muted px-1 text-warning-fg">
                  {s.texto}
                </span>
              ) : (
                <span key={j} className={cn(s.negrita && "font-semibold", s.cursiva && "italic")}>
                  {s.texto}
                </span>
              ),
            )}
          </p>
        ))}
      </article>
    </div>
  );
}
