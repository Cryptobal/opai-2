import { Alerta, Enlace, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { telefono } from "@/lib/fechas";

import { nombreDe } from "./acciones-solicitud";
import type { SolicitudDato } from "./datos";
import { ESTADO } from "./etiquetas";

/** Cuerpo del detalle: mensaje original (contenido externo), datos detectados, resultado y duplicadas. */
export function CuerpoSolicitud({ s, posibles }: { s: SolicitudDato; posibles: SolicitudDato[] }) {
  return (
    <>
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
      <SeccionTarjeta titulo="Datos detectados">
        <ParesGrid
          items={[
            { etiqueta: "Nombre", valor: s.nombre },
            { etiqueta: "Empresa", valor: s.empresa },
            { etiqueta: "Correo", valor: s.email },
            { etiqueta: "Teléfono", valor: s.telefono ? telefono(s.telefono) : null },
            { etiqueta: "RUT", valor: s.rut },
            { etiqueta: "Comuna", valor: s.comuna },
            { etiqueta: "Servicio", valor: s.servicio, ancho: true },
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
