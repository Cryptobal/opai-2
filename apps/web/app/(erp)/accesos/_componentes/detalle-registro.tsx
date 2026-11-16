import { formatearFechaHora } from "@opai/domain";
import {
  Alerta,
  Badge,
  DetailScreen,
  type EstadoPantalla,
  type ItemTimeline,
  Pares,
  type Par,
  Seccion,
  Timeline,
} from "@opai/ds";

import { AccionesRegistro } from "./acciones-registro";
import type { RegistroFicha } from "./datos";
import { DOC_TIPO, estadoRegistro, tipoDe } from "./etiquetas";

const LISTA: Record<string, string> = {
  autorizada: "Autorizado por lista",
  bloqueada: "Bloqueado por lista",
};

/** Pares etiqueta–valor del registro (sin número completo: solo la máscara). */
function paresDe(r: RegistroFicha): Par[] {
  return [
    { etiqueta: DOC_TIPO[r.docTipo] ?? "Documento", valor: r.documento, numerico: true },
    { etiqueta: "Instalación", valor: r.instalacion },
    ...(r.patente ? [{ etiqueta: "Patente", valor: r.patente, numerico: true }] : []),
    { etiqueta: "Entrada", valor: formatearFechaHora(r.entradaEn) },
    ...(r.salidaEn ? [{ etiqueta: "Salida", valor: formatearFechaHora(r.salidaEn) }] : []),
    ...(r.motivoVisita ? [{ etiqueta: "Motivo", valor: r.motivoVisita }] : []),
    { etiqueta: "Lista", valor: r.lista ? LISTA[r.lista] : "Sin lista" },
    {
      etiqueta: "Origen",
      valor: r.origen === "diferido" ? "Sin conexión, enviado después" : "En línea",
    },
  ];
}

const QUIEN_SALIDA: Record<string, string> = { erp: "Desde el ERP", cierre: "Cierre en bloque" };

/** Historial del registro, del hecho más reciente al más antiguo. */
function historialDe(r: RegistroFicha): ItemTimeline[] {
  const equipo = { nombre: r.dispositivo ?? "Portería" };
  const entrada: ItemTimeline = {
    id: "entrada",
    actor: equipo,
    accion: "registró la entrada",
    cuando: formatearFechaHora(r.entradaEn),
    ...(r.origen === "diferido" ? { meta: `Recibido ${formatearFechaHora(r.recibidoEn)}` } : {}),
  };
  const salida: ItemTimeline[] = r.salidaEn
    ? [
        {
          id: "salida",
          actor: { nombre: QUIEN_SALIDA[r.salidaOrigen ?? ""] ?? equipo.nombre },
          accion: "registró la salida",
          cuando: formatearFechaHora(r.salidaEn),
        },
      ]
    : [];
  const anulacion: ItemTimeline[] = r.anulacion
    ? [
        {
          id: "anulacion",
          actor: { nombre: "ERP" },
          accion: "anuló el registro",
          cuando: formatearFechaHora(r.anulacion.en),
          meta: r.anulacion.motivo,
        },
      ]
    : [];
  return [...anulacion, ...salida, entrada];
}

/** Cuerpo de la ficha: datos, aviso de documento enmascarado e historial. */
function CuerpoRegistro({ r }: { r: RegistroFicha }) {
  return (
    <div className="flex flex-col gap-5">
      <Seccion titulo="Registro">
        <Pares items={paresDe(r)} />
      </Seccion>
      {r.anulacion ? (
        <Alerta tono="danger" titulo={`Anulado el ${formatearFechaHora(r.anulacion.en)}`}>
          {r.anulacion.motivo}
        </Alerta>
      ) : null}
      <Alerta tono="info" titulo="Documento enmascarado">
        OPAI guarda solo una huella del documento, nunca el número completo.
      </Alerta>
      <Seccion titulo="Historial">
        <Timeline items={historialDe(r)} />
      </Seccion>
    </div>
  );
}

/**
 * Ficha de un registro (diseño `AccesoDetalle`). Sin «Ver documento completo»: desde el 7-nov-2026 el número
 * no se guarda (solo huella y máscara), así que el aviso lo dice en vez de ofrecer revelarlo.
 */
export function DetalleRegistro({
  r,
  state,
  gestiona = false,
}: {
  r: RegistroFicha | null;
  state: EstadoPantalla;
  /** `acceso:registros.manage`: muestra «Registrar salida» y «Anular registro» (CAR-477). */
  gestiona?: boolean;
}) {
  const e = r ? estadoRegistro({ ...r, anulado: r.anulacion !== null }) : null;
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
            ...(gestiona && !r.anulacion
              ? { acciones: <AccionesRegistro id={r.id} nombre={r.nombre} enSitio={!r.salidaEn} /> }
              : {}),
          }
        : {})}
    >
      {r ? <CuerpoRegistro r={r} /> : null}
    </DetailScreen>
  );
}
