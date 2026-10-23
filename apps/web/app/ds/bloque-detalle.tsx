"use client";

import { Badge, Button, DetailScreen, type EstadoPantalla, Pares, Seccion } from "@opai/ds";

import { Bloque } from "./bloques";

export function BloqueDetalle({ state }: { state: EstadoPantalla }) {
  return (
    <Bloque titulo="DetailScreen · Instalación">
      <DetailScreen
        state={state}
        titulo="Planta Quilicura"
        subtitulo="Logística Andina SpA · Av. Eduardo Frei Montalva 9400, Quilicura"
        estado={
          <>
            <Badge tono="success">Operativa</Badge>
            <span className="text-sm text-fg-subtle">desde 01-03-2024</span>
          </>
        }
        acciones={<Button variant="secondary">Editar</Button>}
        tabs={[
          {
            id: "resumen",
            etiqueta: "Resumen",
            contenido: (
              <div className="grid gap-6 lg:grid-cols-2">
                <Seccion titulo="Contrato">
                  <Pares
                    items={[
                      { etiqueta: "Cliente", valor: "Logística Andina SpA" },
                      { etiqueta: "Inicio", valor: "01-03-2025" },
                      { etiqueta: "Puestos", valor: "5" },
                      { etiqueta: "Valor mensual", valor: "$ 18.450.000", numerico: true },
                    ]}
                  />
                </Seccion>
                <Seccion titulo="Contacto">
                  <Pares
                    items={[
                      { etiqueta: "Encargado", valor: "Rodrigo Vial" },
                      { etiqueta: "Teléfono", valor: "+56 9 8765 4321" },
                    ]}
                  />
                </Seccion>
              </div>
            ),
          },
          {
            id: "puestos",
            etiqueta: "Puestos",
            contador: 5,
            contenido: (
              <p className="text-fg-muted">Lista de puestos (patrón ListScreen anidado).</p>
            ),
          },
          {
            id: "personas",
            etiqueta: "Personas",
            contador: 12,
            contenido: <p className="text-fg-muted">Personas asignadas.</p>,
          },
          {
            id: "documentos",
            etiqueta: "Documentos",
            contenido: <p className="text-fg-muted">Documentos de la instalación.</p>,
          },
        ]}
      />
    </Bloque>
  );
}
