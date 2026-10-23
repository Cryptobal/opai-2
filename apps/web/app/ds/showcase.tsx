"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";

import { Badge, Button, type EstadoPantalla, Input, ListScreen, Pares, Sheet } from "@opai/ds";

import { BloqueDetalle } from "./bloque-detalle";
import { Bloque, BloqueFormulario, BloquePlanillaYDashboard } from "./bloques";
import { PERSONAS, type Persona } from "./datos";

const ESTADOS: EstadoPantalla[] = ["ready", "loading", "empty", "error", "forbidden"];
const TONO: Record<Persona["estado"], "success" | "warning" | "neutro"> = {
  Activa: "success",
  Licencia: "warning",
  Finiquitada: "neutro",
};

export function DsShowcase() {
  const [state, setState] = useState<EstadoPantalla>("ready");
  const [sheet, setSheet] = useState(false);
  const [seleccion, setSeleccion] = useState<Persona | null>(null);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3">
        <span className="text-sm text-fg-muted">Estado de los patrones:</span>
        {ESTADOS.map((e) => (
          <Button
            key={e}
            size="md"
            variant={e === state ? "primary" : "secondary"}
            onClick={() => setState(e)}
          >
            {e}
          </Button>
        ))}
      </div>

      <Bloque titulo="ListScreen · Personas">
        <ListScreen<Persona>
          state={state}
          titulo="Personas"
          subtitulo="24 personas en 4 instalaciones"
          accionPrincipal={
            <Button>
              <Plus className="size-4" /> Nueva persona
            </Button>
          }
          buscador={
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
              <Input placeholder="Buscar por nombre o RUT" className="pl-9" aria-label="Buscar" />
            </div>
          }
          filtros={
            <>
              <Badge tono="accent">Activas ×</Badge>
              <Badge>Planta Quilicura ×</Badge>
            </>
          }
          paginacion={<span className="text-sm text-fg-muted">1–24 de 24</span>}
          items={PERSONAS}
          clave={(p) => p.id}
          onSeleccionar={(p) => {
            setSeleccion(p);
            setSheet(true);
          }}
          tarjeta={(p) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{p.nombre}</p>
                <p className="text-sm text-fg-muted">
                  <span className="font-mono">{p.rut}</span> · {p.cargo}
                </p>
                <p className="truncate text-sm text-fg-muted">{p.instalacion}</p>
              </div>
              <Badge tono={TONO[p.estado]}>{p.estado}</Badge>
            </div>
          )}
          columnas={[
            {
              id: "nombre",
              etiqueta: "Nombre",
              render: (p) => <span className="font-medium">{p.nombre}</span>,
            },
            {
              id: "rut",
              etiqueta: "RUT",
              render: (p) => <span className="font-mono text-sm">{p.rut}</span>,
            },
            { id: "cargo", etiqueta: "Cargo", render: (p) => p.cargo },
            { id: "instalacion", etiqueta: "Instalación", render: (p) => p.instalacion },
            {
              id: "ingreso",
              etiqueta: "Ingreso",
              render: (p) => <span className="tabular-nums">{p.ingreso}</span>,
            },
            {
              id: "estado",
              etiqueta: "Estado",
              render: (p) => <Badge tono={TONO[p.estado]}>{p.estado}</Badge>,
            },
          ]}
          textos={{
            vacio: {
              titulo: "Aún no hay personas",
              descripcion: "Crea la primera persona para empezar.",
              accion: <Button>Nueva persona</Button>,
            },
            error: { onReintentar: () => setState("ready") },
          }}
        />
      </Bloque>

      <BloqueDetalle state={state} />
      <BloqueFormulario state={state} />
      <BloquePlanillaYDashboard state={state} />

      <Sheet
        abierto={sheet}
        onCerrar={() => setSheet(false)}
        titulo={seleccion?.nombre ?? "Persona"}
        acciones={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setSheet(false)}>
              Cerrar
            </Button>
            <Button className="flex-1">Ver ficha</Button>
          </>
        }
      >
        {seleccion ? (
          <Pares
            items={[
              { etiqueta: "RUT", valor: <span className="font-mono">{seleccion.rut}</span> },
              { etiqueta: "Cargo", valor: seleccion.cargo },
              { etiqueta: "Instalación", valor: seleccion.instalacion },
              {
                etiqueta: "Estado",
                valor: <Badge tono={TONO[seleccion.estado]}>{seleccion.estado}</Badge>,
              },
            ]}
          />
        ) : null}
      </Sheet>
    </div>
  );
}
