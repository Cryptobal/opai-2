import { Alerta, Enlace, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { telefono } from "@/lib/fechas";

import { nombreDe } from "./acciones-solicitud";
import type { AccionAgenteDato, SolicitudDato } from "./datos";
import { ESTADO } from "./etiquetas";
import {
  esCampoAgente,
  MarcaCampoAgente,
  PanelAgenteSolicitud,
  tituloDatosAgente,
} from "./panel-agente-solicitud";

function fila(
  etiqueta: string,
  valor: string | null | undefined,
  s: SolicitudDato,
  campo: string,
) {
  const v = valor ?? null;
  return {
    etiqueta,
    valor: v ? (
      <span className="inline-flex items-center gap-1.5">
        {v}
        <MarcaCampoAgente visible={esCampoAgente(s, campo)} />
      </span>
    ) : null,
  };
}

/** Cuerpo del detalle: mensaje original (contenido externo), datos detectados, resultado y duplicadas. */
export function CuerpoSolicitud({
  s,
  posibles,
  accionesAgente = [],
}: {
  s: SolicitudDato;
  posibles: SolicitudDato[];
  accionesAgente?: AccionAgenteDato[];
}) {
  const datos = tituloDatosAgente(s);
  return (
    <>
      <PanelAgenteSolicitud s={s} acciones={accionesAgente} />
      {s.estado === "descartada" ? (
        <Alerta tono="warning" titulo="Solicitud descartada">
          {s.motivoDescarte}
        </Alerta>
      ) : null}
      {s.duplicadaDeId ? (
        <Alerta tono="info" titulo="Duplicada de otra solicitud">
          <Enlace Link={LinkNext} href={`/solicitudes/${s.duplicadaDeId}`} className="underline">
            Ver la original
          </Enlace>
        </Alerta>
      ) : null}
      <SeccionTarjeta titulo="Mensaje original">
        <p className="t-caption mb-2">Contenido externo · texto original, sin formato</p>
        {s.asunto ? <p className="mb-2 font-medium">{s.asunto}</p> : null}
        <p className="whitespace-pre-wrap break-words">{s.textoOriginal}</p>
      </SeccionTarjeta>
      <SeccionTarjeta titulo={datos.titulo}>
        {datos.desc ? <p className="t-caption mb-3">{datos.desc}</p> : null}
        <ParesGrid
          items={[
            fila("Nombre", s.nombre, s, "nombre"),
            fila("Empresa", s.empresa, s, "empresa"),
            fila("Correo", s.email, s, "email"),
            {
              etiqueta: "Teléfono",
              valor: s.telefono ? (
                <span className="inline-flex items-center gap-1.5">
                  {telefono(s.telefono)}
                  <MarcaCampoAgente visible={esCampoAgente(s, "telefono")} />
                </span>
              ) : null,
            },
            fila("RUT", s.rut, s, "rut"),
            fila("Comuna", s.comuna, s, "comuna"),
            fila("Servicio", s.servicio, s, "servicio"),
            fila("Fuente", s.fuente, s, "fuente"),
            ...(s.notasAgente
              ? [{ etiqueta: "Notas del agente", valor: s.notasAgente, ancho: true as const }]
              : []),
            {
              etiqueta: "Registrada por",
              valor: s.registradaPorTipo === "agente" ? "OPAI (agente)" : "Una persona",
            },
          ]}
        />
      </SeccionTarjeta>
      {s.estado === "convertida" ? (
        <SeccionTarjeta titulo="Resultado">
          <ParesGrid
            items={[
              {
                etiqueta: "Negocio",
                valor: s.negocioId ? (
                  <Enlace Link={LinkNext} href={`/negocios/${s.negocioId}`} className="underline">
                    Ver negocio
                  </Enlace>
                ) : null,
              },
              {
                etiqueta: "Cuenta",
                valor: s.cuentaId ? (
                  <Enlace Link={LinkNext} href={`/cuentas/${s.cuentaId}`} className="underline">
                    Ver cuenta
                  </Enlace>
                ) : null,
              },
            ]}
          />
        </SeccionTarjeta>
      ) : null}
      {posibles.length ? (
        <SeccionTarjeta titulo="Posibles duplicadas">
          <p className="t-caption mb-2">Llegaron con el mismo correo o RUT.</p>
          <ul className="flex flex-col gap-1">
            {posibles.map((d) => (
              <li key={d.id}>
                <Enlace Link={LinkNext} href={`/solicitudes/${d.id}`} className="underline">
                  {nombreDe(d)} · {ESTADO[d.estado].etiqueta}
                </Enlace>
              </li>
            ))}
          </ul>
        </SeccionTarjeta>
      ) : null}
    </>
  );
}
