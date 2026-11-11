import Link from "next/link";

import { Alerta, cn } from "@opai/ds";

import type { VistaRelleno } from "./tipos";

/**
 * Vista previa del documento con los datos de la persona (diseño 07). Lo que falta se muestra como
 * variable en ámbar dentro del texto y, aparte, con su motivo; mientras falte algo no se puede generar.
 */
export function VistaDocumento({ vista, fichaHref }: { vista: VistaRelleno; fichaHref: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {vista.faltantes.length > 0 ? (
          <Alerta
            tono="warning"
            titulo={
              vista.faltantes.length === 1
                ? `Falta un dato: ${vista.faltantes[0]?.etiqueta ?? ""}`
                : `Faltan ${vista.faltantes.length} datos`
            }
          >
            <ul className="mt-1 flex flex-col gap-1">
              {vista.faltantes.map((f) => (
                <li key={f.clave}>
                  <span className="font-medium">{f.etiqueta}:</span> {f.motivo}
                </li>
              ))}
            </ul>
            <Link href={fichaHref} className="mt-2 inline-block underline">
              Abrir la ficha de la persona
            </Link>
          </Alerta>
        ) : (
          <Alerta tono="success" titulo="Documento completo">
            Todos los datos están en la ficha. La generación del PDF y el envío a firma llegan en el siguiente paso.
          </Alerta>
        )}
        <dl className="t-body-sm flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Persona</dt>
            <dd>{vista.persona.nombre}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Plantilla</dt>
            <dd>
              {vista.plantilla.nombre} · versión {vista.plantilla.version}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Firma</dt>
            <dd>
              {vista.firma.nivel} · {vista.firma.firmantes === "ambos" ? "trabajador y empleador" : vista.firma.firmantes}
            </dd>
          </div>
        </dl>
      </div>
      <article className="flex min-w-0 flex-col gap-3 rounded-sm border border-paper-rule bg-paper px-4 py-4 text-paper-fg md:px-9 md:py-8">
        <h2 className="t-label text-center">{vista.plantilla.nombre}</h2>
        {vista.parrafos.map((p, i) => (
          <p key={i} className="t-body-sm whitespace-pre-line text-pretty leading-6">
            {p.map((s, j) => {
              const estilo = cn(s.negrita && "font-semibold", s.cursiva && "italic");
              if (s.faltante)
                return (
                  <span key={j} className="t-overline t-mono rounded-sm bg-warning-muted px-1 text-warning-fg">
                    {s.texto}
                  </span>
                );
              return estilo ? (
                <span key={j} className={estilo}>
                  {s.texto}
                </span>
              ) : (
                <span key={j}>{s.texto}</span>
              );
            })}
          </p>
        ))}
      </article>
    </div>
  );
}
