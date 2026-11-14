import {
  Alerta,
  Badge,
  DetailScreen,
  type EstadoPantalla,
  Pares,
  Seccion,
  Timeline,
} from "@opai/ds";

import { fechaHora } from "@/lib/formato";

import type { RegistroFicha } from "./datos";
import { DOC_TIPO, estadoRegistro, tipoDe } from "./etiquetas";

const LISTA: Record<string, string> = {
  autorizada: "Autorizado por lista",
  bloqueada: "Bloqueado por lista",
};

/**
 * Ficha de un registro (diseño `AccesoDetalle`). Sin «Ver documento completo»: desde el 7-nov-2026 el número
 * no se guarda (solo huella y máscara), así que el aviso lo dice en vez de ofrecer revelarlo.
 */
export function DetalleRegistro({ r, state }: { r: RegistroFicha | null; state: EstadoPantalla }) {
  const e = r ? estadoRegistro(r) : null;
  return (
    <DetailScreen
      state={r ? state : state === "ready" ? "error" : state}
      titulo={r?.nombre ?? "Registro de acceso"}
      textos={{
        error: {
          titulo: "No pudimos cargar el registro",
          descripcion: "Puede que ya no esté a tu cargo.",
        },
      }}
      {...(r && e
        ? {
            estado: (
              <Badge tono={e.tono} punto>
                {e.etiqueta}
              </Badge>
            ),
            subtitulo: [tipoDe(r.tipoRegistro), r.empresa].filter(Boolean).join(" · "),
          }
        : {})}
    >
      {r ? (
        <div className="flex flex-col gap-5">
          <Seccion titulo="Registro">
            <Pares
              items={[
                {
                  etiqueta: DOC_TIPO[r.docTipo] ?? "Documento",
                  valor: r.documento,
                  numerico: true,
                },
                { etiqueta: "Instalación", valor: r.instalacion },
                ...(r.patente ? [{ etiqueta: "Patente", valor: r.patente, numerico: true }] : []),
                { etiqueta: "Entrada", valor: fechaHora(r.entradaEn) },
                ...(r.salidaEn ? [{ etiqueta: "Salida", valor: fechaHora(r.salidaEn) }] : []),
                ...(r.motivoVisita ? [{ etiqueta: "Motivo", valor: r.motivoVisita }] : []),
                { etiqueta: "Lista", valor: r.lista ? LISTA[r.lista] : "Sin lista" },
                {
                  etiqueta: "Origen",
                  valor: r.origen === "diferido" ? "Sin conexión, enviado después" : "En línea",
                },
              ]}
            />
          </Seccion>
          <Alerta tono="info" titulo="Documento enmascarado">
            OPAI guarda solo una huella del documento, nunca el número completo.
          </Alerta>
          <Seccion titulo="Historial">
            <Timeline
              items={[
                ...(r.salidaEn
                  ? [
                      {
                        id: "salida",
                        actor: { nombre: r.dispositivo ?? "Portería" },
                        accion: "registró la salida",
                        cuando: fechaHora(r.salidaEn),
                      },
                    ]
                  : []),
                {
                  id: "entrada",
                  actor: { nombre: r.dispositivo ?? "Portería" },
                  accion: "registró la entrada",
                  cuando: fechaHora(r.entradaEn),
                  ...(r.origen === "diferido"
                    ? { meta: `Recibido ${fechaHora(r.recibidoEn)}` }
                    : {}),
                },
              ]}
            />
          </Seccion>
        </div>
      ) : null}
    </DetailScreen>
  );
}
