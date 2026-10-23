"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";

import {
  Avatar,
  Badge,
  Button,
  Chip,
  ChipAgregar,
  type EstadoPantalla,
  Input,
  ListScreen,
  Pares,
  Sheet,
} from "@opai/ds";

import { Bloque } from "./bloques";
import { PERSONAS, type Persona } from "./datos";

const TONO: Record<Persona["estado"], "success" | "warning" | "neutro"> = {
  Activa: "success",
  Licencia: "warning",
  Finiquitada: "neutro",
};

export function BloqueLista({
  state,
  onReintentar,
}: {
  state: EstadoPantalla;
  onReintentar: () => void;
}) {
  const [seleccion, setSeleccion] = useState<Persona | null>(null);
  return (
    <Bloque titulo="ListScreen · Personas">
      <ListScreen<Persona>
        state={state}
        titulo="Personas"
        subtitulo="24 personas"
        accionPrincipal={
          <Button>
            <Plus className="size-4" /> Nueva persona
          </Button>
        }
        buscador={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input placeholder="Nombre o RUT" className="pl-9" aria-label="Buscar" />
          </div>
        }
        filtros={
          <>
            <Chip etiqueta="Región" valor="RM" onQuitar={() => undefined} />
            <Chip etiqueta="Contrato" valor="Indefinido" onQuitar={() => undefined} />
            <ChipAgregar />
          </>
        }
        paginacion={
          <>
            <span>1–20 de 24</span>
            <span className="t-numeric">1 / 2</span>
          </>
        }
        items={PERSONAS}
        clave={(p) => p.id}
        onSeleccionar={setSeleccion}
        tarjeta={(p) => (
          <>
            <Avatar nombre={p.nombre} size="lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-md font-medium text-fg">{p.nombre}</span>
              <span className="block truncate text-base text-fg-muted">
                {p.cargo} · {p.instalacion}
              </span>
              <span className="t-mono block text-fg-subtle">{p.rut}</span>
            </span>
            <Badge tono={TONO[p.estado]}>{p.estado}</Badge>
          </>
        )}
        columnas={[
          {
            id: "nombre",
            etiqueta: "Nombre",
            render: (p) => (
              <span className="flex items-center gap-2.5 font-medium">
                <Avatar nombre={p.nombre} size="sm" />
                {p.nombre}
              </span>
            ),
          },
          { id: "rut", etiqueta: "RUT", render: (p) => <span className="t-mono">{p.rut}</span> },
          { id: "cargo", etiqueta: "Cargo", render: (p) => p.cargo },
          { id: "instalacion", etiqueta: "Instalación", render: (p) => p.instalacion },
          {
            id: "estado",
            etiqueta: "Estado",
            render: (p) => <Badge tono={TONO[p.estado]}>{p.estado}</Badge>,
          },
          {
            id: "ingreso",
            etiqueta: "Ingreso",
            render: (p) => <span className="t-numeric font-normal">{p.ingreso}</span>,
          },
        ]}
        textos={{
          vacio: {
            titulo: "Aún no hay personas",
            descripcion: "Crea la primera persona para empezar.",
            accion: <Button>Nueva persona</Button>,
          },
          error: { onReintentar },
        }}
      />
      <Sheet
        abierto={seleccion !== null}
        onCerrar={() => setSeleccion(null)}
        titulo={seleccion?.nombre ?? "Persona"}
        acciones={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setSeleccion(null)}>
              Cerrar
            </Button>
            <Button className="flex-1">Ver ficha</Button>
          </>
        }
      >
        {seleccion ? (
          <Pares
            items={[
              { etiqueta: "RUT", valor: <span className="t-mono">{seleccion.rut}</span> },
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
    </Bloque>
  );
}
