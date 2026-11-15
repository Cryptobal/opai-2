import Link from "next/link";

import { Alerta, cn } from "@opai/ds";

import { BotonGenerarDocumento } from "./boton-generar-documento";
import type { VistaRellenoEntidad, VistaRellenoPersona } from "./tipos";

const ETIQUETA = { cuenta: "Cuenta", instalacion: "Instalación" } as const;

type Props = {
  vista: VistaRellenoPersona | VistaRellenoEntidad;
  fichaHref: string;
  documentosHref: string;
};

function esPersona(v: Props["vista"]): v is VistaRellenoPersona {
  return "persona" in v;
}

/**
 * Vista previa al generar un documento (persona, cuenta o instalación). Lo que falta se señala en
 * ámbar; mientras falte algo no se puede generar. Una sola copia para Personas y entidad (CAR-439).
 */
export function VistaGenerar({ vista, fichaHref, documentosHref }: Props) {
  const persona = esPersona(vista);
  const sujeto = persona
    ? { etiqueta: "Persona", nombre: vista.persona.nombre, id: vista.persona.id }
    : { etiqueta: ETIQUETA[vista.entidad.tipo], nombre: vista.entidad.nombre, id: vista.entidad.id };
  const fichaLink = persona ? "Abrir la ficha de la persona" : "Abrir la ficha";
  const textoCompleto = persona
    ? "Todos los datos están en la ficha. Puedes generar el PDF; el envío a firma llega en el siguiente paso."
    : "Todos los datos están en la ficha. Puedes generar el PDF.";
  const mensajeExito = persona
    ? "El PDF quedó en los documentos de la persona."
    : "El PDF quedó en los documentos.";
  const input = persona ? { personaId: sujeto.id } : { entidadId: sujeto.id };
  const firma = persona ? vista.firma : null;
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
              {fichaLink}
            </Link>
          </Alerta>
        ) : (
          <Alerta tono="success" titulo="Documento completo">
            {textoCompleto}
          </Alerta>
        )}
        <BotonGenerarDocumento
          plantillaId={vista.plantilla.id}
          documentosHref={documentosHref}
          puedeGenerar={vista.puedeGenerar}
          mensajeExito={mensajeExito}
          input={input}
        />
        <dl className="t-body-sm flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">{sujeto.etiqueta}</dt>
            <dd>{sujeto.nombre}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">Plantilla</dt>
            <dd>
              {vista.plantilla.nombre} · versión {vista.plantilla.version}
            </dd>
          </div>
          {firma ? (
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">Firma</dt>
              <dd>
                {firma.nivel} · {firma.firmantes === "ambos" ? "trabajador y empleador" : firma.firmantes}
              </dd>
            </div>
          ) : null}
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
