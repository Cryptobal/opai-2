"use client";

import { Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { esParteFinanzas } from "@opai/domain";
import { Badge, Button, ListScreen } from "@opai/ds";

import { type EntradaCatalogo, TEXTO_INCLUIDO_EN_BASE } from "../../facturacion/_componentes/cobro";

// La hoja (Radix y formulario) se descarga al abrirla: no pesa en la ruta (ADR-037).
const HojaPrecioLista = dynamic(() => import("./hoja-precio-lista").then((m) => m.HojaPrecioLista));

function Precio({ e }: { e: EntradaCatalogo }) {
  if (e.incluidoEnBase) return <Badge tono="info">{TEXTO_INCLUIDO_EN_BASE}</Badge>;
  return e.textoPrecio ? (
    <span className="t-numeric text-base text-fg">{e.textoPrecio}</span>
  ) : (
    <span className="t-caption">Sin precio de lista</span>
  );
}

const necesita = (e: EntradaCatalogo) =>
  e.dependenciasTexto.length ? `Necesita ${e.dependenciasTexto.join(" y ")}` : "—";

/**
 * Catálogo: una fila por cobrable. El plan base va arriba, luego los módulos y Finanzas con sus siete
 * partes desplegadas. «Editar precio» abre la hoja del precio de lista; `support` solo lo ve.
 */
export function ListaCatalogo(props: { entradas: EntradaCatalogo[]; puedeEditar: boolean }) {
  const { entradas, puedeEditar } = props;
  const [editando, setEditando] = useState<EntradaCatalogo | null>(null);
  const editable = (e: EntradaCatalogo) => puedeEditar && !e.incluidoEnBase;
  return (
    <>
      <ListScreen<EntradaCatalogo>
        state="ready"
        titulo="Catálogo"
        soloTelefono
        items={entradas}
        clave={(e) => e.id}
        {...(puedeEditar
          ? { onSeleccionar: (e: EntradaCatalogo) => editable(e) && setEditando(e) }
          : {})}
        textos={{ vacio: { titulo: "El catálogo está vacío" } }}
        tarjeta={(e) => (
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={esParteFinanzas(e.id) ? "pl-4" : ""}>
              <span className="text-base font-medium text-fg">{e.nombre}</span>
              <span className="t-caption block">{e.incluye}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2">
                <Precio e={e} />
                {e.dependenciasTexto.length ? (
                  <span className="t-caption">{necesita(e)}</span>
                ) : null}
              </span>
            </span>
          </span>
        )}
        columnas={[
          {
            id: "nombre",
            etiqueta: "Cobrable",
            className: "max-w-md whitespace-normal",
            render: (e) => (
              <span className={`flex min-w-0 flex-col ${esParteFinanzas(e.id) ? "pl-6" : ""}`}>
                <span className="font-medium text-fg">{e.nombre}</span>
                <span className="t-caption">{e.incluye}</span>
              </span>
            ),
          },
          { id: "precio", etiqueta: "Precio de lista", render: (e) => <Precio e={e} /> },
          {
            id: "dependencias",
            etiqueta: "Dependencias",
            className: "max-w-48 whitespace-normal",
            render: (e) => <span className="t-caption">{necesita(e)}</span>,
          },
          {
            id: "acciones",
            etiqueta: "",
            className: "w-px whitespace-nowrap text-right",
            render: (e) =>
              editable(e) ? (
                <Button variant="secondary" onClick={() => setEditando(e)}>
                  <Pencil className="size-4" aria-hidden />
                  Editar precio
                </Button>
              ) : null,
          },
        ]}
      />
      <p className="t-caption mt-3">
        La firma electrónica se cobra por uso y no está en este catálogo. El motor de sueldos va
        dentro de Remuneraciones (Nómina). El precio de lista solo rellena la hoja «Cobro» de cada
        empresa: no cambia lo ya pactado ni los cargos generados.
      </p>
      {editando ? (
        <HojaPrecioLista key={editando.id} entrada={editando} onCerrar={() => setEditando(null)} />
      ) : null}
    </>
  );
}
