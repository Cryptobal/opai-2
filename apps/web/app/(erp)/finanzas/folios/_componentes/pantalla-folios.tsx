"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge, Button, ListScreen, type Columna, type EstadoPantalla } from "@opai/ds";
import { fecha, hoyIso } from "@/lib/fechas";

import { AccionCaf } from "./accion-caf";
import { accionCaf, estadoFolio, etiquetaAmbienteCaf, foliosUsados, nombreTipoDte } from "./etiquetas-dte";
import type { FolioCaf } from "./tipos";

const HojaSubirCaf = dynamic(() => import("./hoja-subir-caf").then((m) => ({ default: m.HojaSubirCaf })));

type Props = {
  state: EstadoPantalla;
  items: FolioCaf[];
  acceso: boolean;
  puedeCargar: boolean;
};

export function PantallaFolios({ state, items, acceso, puedeCargar }: Props) {
  const [subirAbierta, setSubirAbierta] = useState(false);
  const hoy = hoyIso();
  const accionDe = (f: FolioCaf) => {
    const a = puedeCargar && f.id ? accionCaf(f, hoy) : null;
    return a ? <AccionCaf folioId={f.id} accion={a} rango={`${f.folioDesde}–${f.folioHasta}`} /> : null;
  };
  const columnas: Columna<FolioCaf>[] = [
    {
      id: "tipo",
      etiqueta: "Tipo",
      render: (f) => nombreTipoDte(f.tipoDte),
    },
    {
      id: "rango",
      etiqueta: "Desde – hasta",
      render: (f) => (
        <span className="t-mono">
          {f.folioDesde} – {f.folioHasta}
        </span>
      ),
    },
    {
      id: "usados",
      etiqueta: "Usados",
      className: "text-right",
      render: (f) => <span className="t-numeric">{foliosUsados(f)}</span>,
    },
    {
      id: "disp",
      etiqueta: "Disponibles",
      className: "text-right",
      render: (f) => <span className="t-numeric">{f.restantes}</span>,
    },
    {
      id: "ambiente",
      etiqueta: "Ambiente",
      render: (f) => {
        const a = etiquetaAmbienteCaf(f.ambiente);
        return <Badge tono={a.tono}>{a.etiqueta}</Badge>;
      },
    },
    {
      id: "vence",
      etiqueta: "Vence",
      render: (f) => (f.cafVenceEn ? fecha(f.cafVenceEn) : "—"),
    },
    {
      id: "estado",
      etiqueta: "Estado",
      render: (f) => {
        const e = estadoFolio(f, hoy);
        return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
      },
    },
    {
      id: "accion",
      etiqueta: "",
      render: (f) => accionDe(f),
    },
  ];

  return (
    <>
      <ListScreen<FolioCaf>
        state={state}
        titulo="Folios"
        sinCabecera
        // Con folios cargados el botón va arriba; sin ninguno lo ofrece el estado vacío (no se duplica).
        accionPrincipal={
          puedeCargar && items.length > 0 ? (
            <Button variant="primary" onClick={() => setSubirAbierta(true)}>
              <Plus className="size-4" aria-hidden />
              Subir CAF
            </Button>
          ) : undefined
        }
        items={items}
        clave={(f) => f.id || `${f.tipoDte}-${f.folioDesde}`}
        grupo={(f) => nombreTipoDte(f.tipoDte)}
        columnas={columnas}
        tarjeta={(f) => {
          const e = estadoFolio(f, hoy);
          return (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium">{nombreTipoDte(f.tipoDte)}</span>
                <span className="t-mono text-sm text-fg-muted">
                  {f.folioDesde}–{f.folioHasta} · quedan {f.restantes}
                </span>
                {f.cafVenceEn ? (
                  <span className="text-sm text-fg-muted">Vence {fecha(f.cafVenceEn)}</span>
                ) : null}
                <span className="text-sm text-fg-muted">{etiquetaAmbienteCaf(f.ambiente).etiqueta}</span>
              </span>
              <span className="flex flex-col items-end gap-2">
                <Badge tono={e.tono}>{e.etiqueta}</Badge>
                {accionDe(f)}
              </span>
            </>
          );
        }}
        textos={{
          error: { titulo: "No pudimos cargar los folios" },
          vacio: {
            titulo: "Sin folios cargados",
            descripcion: "Sube el XML del CAF emitido por el SII para habilitar la emisión electrónica.",
            accion: puedeCargar ? (
              <Button variant="primary" onClick={() => setSubirAbierta(true)}>
                Subir CAF
              </Button>
            ) : undefined,
          },
        }}
      />
      {!acceso ? null : (
        <HojaSubirCaf abierta={subirAbierta} onAbiertaChange={setSubirAbierta} />
      )}
    </>
  );
}
