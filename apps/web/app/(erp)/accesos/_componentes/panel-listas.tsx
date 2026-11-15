import { formatearFecha } from "@opai/domain";
import { Badge, type Columna, type EstadoPantalla, ListScreen, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { AgregarEntrada } from "./agregar-entrada";
import { tipoDe } from "./etiquetas";
import { QuitarEntrada } from "./quitar-entrada";

export type EntradaLista = {
  id: string;
  tipo: "autorizada" | "bloqueada";
  mascara: string;
  nombre: string | null;
  motivo: string | null;
  tiposRegistro: string[];
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  dias: number[];
  desdeMin: number | null;
  hastaMin: number | null;
  usoUnico: boolean;
};

const DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function diasYHorario(e: EntradaLista): string {
  const dias =
    e.dias.length === 0 || e.dias.length === 7
      ? "Todos los días"
      : e.dias.map((d) => DIA[d]).join(", ");
  return e.desdeMin !== null && e.hastaMin !== null
    ? `${dias} ${hhmm(e.desdeMin)}–${hhmm(e.hastaMin)}`
    : dias;
}
const vigencia = (e: EntradaLista) =>
  e.vigenteHasta ? `Hasta ${formatearFecha(e.vigenteHasta)}` : "Sin vencimiento";
const tipos = (e: EntradaLista) =>
  e.tiposRegistro.length ? e.tiposRegistro.map(tipoDe).join(", ") : "Todos";

/** Columnas de la tabla: en bloqueadas, el motivo (solo lo ve quien gestiona listas) en vez de días y horario. */
function columnasDe(bloq: boolean): Columna<EntradaLista>[] {
  return [
    { id: "nombre", etiqueta: "Nombre", render: (e) => e.nombre ?? "—" },
    {
      id: "doc",
      etiqueta: "Documento",
      render: (e) => <span className="t-numeric">{e.mascara}</span>,
    },
    { id: "tipos", etiqueta: "Tipos", render: tipos },
    { id: "vig", etiqueta: "Vigencia", render: vigencia },
    bloq
      ? { id: "motivo", etiqueta: "Motivo", render: (e) => e.motivo ?? "—" }
      : { id: "dias", etiqueta: "Días y horario", render: diasYHorario },
    ...(bloq
      ? []
      : [
          {
            id: "uso",
            etiqueta: "Uso",
            render: (e: EntradaLista) => (
              <Badge tono={e.usoUnico ? "warning" : "neutro"}>
                {e.usoUnico ? "Uso único" : "Permanente"}
              </Badge>
            ),
          },
        ]),
  ];
}

function TarjetaEntrada({ e }: { e: EntradaLista }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="truncate text-base font-medium text-fg">{e.nombre ?? e.mascara}</span>
      <span className="t-caption">
        {tipos(e)} · <span className="t-numeric">{e.mascara}</span> · {vigencia(e)}
      </span>
    </span>
  );
}

type Props = {
  state: EstadoPantalla;
  instalacionId: string;
  tipo: "autorizada" | "bloqueada";
  entradas: EntradaLista[];
  /** Ruta de la lista con el tipo elegido (`?lista=`), para el segmento Autorizadas · Bloqueadas. */
  href: (tipo: "autorizada" | "bloqueada") => string;
};

/** Listas autorizada y bloqueada de una instalación (diseño `Listas`). El motivo del bloqueo solo lo ve quien gestiona. */
export function PanelListas({ state, instalacionId, tipo, entradas, href }: Props) {
  const bloq = tipo === "bloqueada";
  return (
    <div className="flex flex-col gap-3">
      <Segmentado
        etiqueta="Tipo de lista"
        activa={tipo}
        Link={LinkNext}
        opciones={[
          { id: "autorizada", etiqueta: "Autorizadas", href: href("autorizada") },
          { id: "bloqueada", etiqueta: "Bloqueadas", href: href("bloqueada") },
        ]}
      />
      <ListScreen<EntradaLista>
        state={state}
        titulo={bloq ? "Bloqueadas" : "Autorizadas"}
        accionPrincipal={<AgregarEntrada instalacionId={instalacionId} tipo={tipo} />}
        items={entradas}
        acciones={(e) => <QuitarEntrada id={e.id} nombre={e.nombre ?? e.mascara} />}
        clave={(e) => e.id}
        tarjeta={(e) => <TarjetaEntrada e={e} />}
        columnas={columnasDe(bloq)}
        textos={{
          vacio: {
            titulo: "Esta lista está vacía",
            descripcion: bloq
              ? "Quien esté aquí no entra, ni siquiera sin conexión."
              : "Si la instalación tiene lista, solo entra quien esté en ella o tenga prerregistro.",
          },
        }}
      />
    </div>
  );
}
