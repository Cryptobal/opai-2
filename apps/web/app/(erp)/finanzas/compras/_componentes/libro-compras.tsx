import { FileText, Plus } from "lucide-react";

import { Alerta, Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { pesos, rut } from "@/lib/fechas";

import { type Centro, type Compra, diaCL, type Libro, NOMBRE_DTE } from "../../_componentes/tipos";
import { periodosRecientes } from "./datos";

/** Total con signo: una nota de crédito resta del libro. */
const monto = (c: Compra) => pesos(c.tipoDte === 61 ? -c.montoTotal : c.montoTotal);

function CentroCelda({ c, centros }: { c: Compra; centros: Centro[] }) {
  if (c.centroCostoNombre) return <span>{c.centroCostoNombre}</span>;
  const sugerido = c.sugerencia
    ? centros.find((x) => x.id === c.sugerencia?.centroCostoId)?.nombre
    : undefined;
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge tono="warning">Sin centro de costo</Badge>
      {sugerido ? (
        <span className="text-xs text-fg-muted">
          Sugerido: {sugerido} ({c.sugerencia?.origen === "proveedor" ? "proveedor" : "última compra"})
        </span>
      ) : null}
    </span>
  );
}

function Plazo({ c }: { c: Compra }) {
  if (c.estadoRecepcion !== "pendiente_revision") return <span>{c.estadoRecepcion}</span>;
  if (c.diasParaReclamo < 0) return <Badge tono="danger">Plazo vencido</Badge>;
  return (
    <Badge tono={c.diasParaReclamo <= 2 ? "warning" : "neutro"}>
      {c.diasParaReclamo === 0 ? "Vence hoy" : `${c.diasParaReclamo} d`}
    </Badge>
  );
}

/** Libro de compras (01): documentos recibidos con centro de costo, plazo y estado de pago. */
export function LibroCompras(p: {
  state: EstadoPantalla;
  libro: Libro | null;
  centros: Centro[];
  gestiona: boolean;
  filtrado: boolean;
}) {
  const items = p.libro?.items ?? [];
  const r = p.libro?.resumen;
  return (
    <div className="flex flex-col gap-4">
      {r && r.sinCentroCosto > 0 ? (
        <Alerta
          tono="warning"
          titulo={`${r.sinCentroCosto} ${r.sinCentroCosto === 1 ? "documento sin centro de costo" : "documentos sin centro de costo"}`}
          {...(p.gestiona
            ? { accion: <EnlaceBotonHoja href="?lote=1" variante="secondary">Asignar en lote</EnlaceBotonHoja> }
            : {})}
        >
          Asígnalos para que el gasto llegue a la instalación correcta.
        </Alerta>
      ) : null}
      <ListScreen<Compra>
        state={p.state}
        titulo="Libro de compras"
        {...(r
          ? { subtitulo: `${r.documentos} documentos · Neto ${pesos(r.neto)} · Total ${pesos(r.total)}` }
          : {})}
        {...(p.gestiona
          ? { accionPrincipal: <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>Registrar documento</EnlaceBotonHoja> }
          : {})}
        buscador={<Buscador placeholder="Buscar folio o proveedor" />}
        filtros={
          <ChipsFiltro
            filtros={[
              { param: "periodo", etiqueta: "Período", opciones: periodosRecientes() },
              { param: "sin_centro", etiqueta: "Centro", opciones: [{ valor: "1", etiqueta: "Sin centro de costo" }] },
            ]}
          />
        }
        items={items}
        clave={(c) => c.id}
        Link={LinkNext}
        textos={{
          vacio: p.filtrado
            ? { titulo: "Ningún documento coincide", descripcion: "Quita un filtro para ver más." }
            : {
                titulo: "El libro de compras está vacío",
                descripcion: "Registra un documento recibido o impórtalos desde el RCV con la API o el agente.",
              },
        }}
        tarjeta={(c) => (
          <>
            <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
              <FileText className="size-4" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium">{c.proveedorNombre}</span>
              <span className="text-sm text-fg-muted">
                {NOMBRE_DTE[c.tipoDte]} {c.folio} · {diaCL(c.fechaRecepcion)}
              </span>
              <CentroCelda c={c} centros={p.centros} />
            </span>
            <span className="flex flex-none flex-col items-end gap-1">
              <span className="t-numeric font-medium">{monto(c)}</span>
              <Badge>Sin conciliar</Badge>
            </span>
          </>
        )}
        columnas={[
          { id: "doc", etiqueta: "Documento", render: (c) => `${NOMBRE_DTE[c.tipoDte]} ${c.folio}` },
          {
            id: "prov",
            etiqueta: "Proveedor",
            render: (c) => (
              <span className="flex flex-col">
                <span>{c.proveedorNombre}</span>
                <span className="t-mono text-xs text-fg-muted">{rut(c.proveedorRut)}</span>
              </span>
            ),
          },
          { id: "rec", etiqueta: "Recepción", render: (c) => diaCL(c.fechaRecepcion) },
          { id: "tot", etiqueta: "Total", className: "text-right t-numeric", render: monto },
          { id: "cc", etiqueta: "Centro de costo", render: (c) => <CentroCelda c={c} centros={p.centros} /> },
          { id: "pago", etiqueta: "Pago", render: () => <Badge>Sin conciliar</Badge> },
          { id: "plazo", etiqueta: "Aceptar o reclamar", render: (c) => <Plazo c={c} /> },
        ]}
      />
      {p.libro?.siguiente ? (
        <p className="text-sm text-fg-muted">
          Se muestran los primeros 100 documentos: acota el período para ver el resto.
        </p>
      ) : null}
    </div>
  );
}
