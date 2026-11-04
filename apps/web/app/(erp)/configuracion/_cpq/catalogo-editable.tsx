"use client";

import { useState } from "react";

import { formatearNumero } from "@opai/domain";
import { Badge, avisar, Button, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { CategoriaCatalogo, ItemCatalogo } from "./catalogo-tipos";
import { HojaCategoriaCatalogo } from "./hoja-categoria-catalogo";
import { HojaItemCatalogo } from "./hoja-item-catalogo";

type Abierta = { tipo: "item"; item?: ItemCatalogo } | { tipo: "categoria"; categoria?: CategoriaCatalogo } | null;

/** Catálogo de CPQ editable: ítems agrupados por categoría; crear, editar, archivar y restaurar (`cpq:modelo.manage`). */
export function CatalogoEditable({
  items,
  categorias,
  editable,
}: {
  items: readonly ItemCatalogo[];
  categorias: readonly CategoriaCatalogo[];
  editable: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [verArchivados, setVerArchivados] = useState(false);
  const activas = categorias.filter((c) => c.activa);

  async function alternarItem(i: ItemCatalogo) {
    const r = i.activo
      ? await ejecutar("cpq.catalogo_items.archivar", { id: i.id })
      : await ejecutar("cpq.catalogo_items.update", { id: i.id, activo: true });
    if (r != null) avisar.exito(i.activo ? "Ítem archivado" : "Ítem restaurado");
  }
  async function alternarCategoria(c: CategoriaCatalogo) {
    const r = c.activa
      ? await ejecutar("cpq.catalogo_categorias.desactivar", { id: c.id })
      : await ejecutar("cpq.catalogo_categorias.update", { id: c.id, activa: true });
    if (r != null) avisar.exito(c.activa ? "Categoría archivada" : "Categoría restaurada");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Switch etiqueta="Ver archivados" activo={verArchivados} onCambiar={setVerArchivados} />
        {editable ? (
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setAbierta({ tipo: "categoria" })}>
              Nueva categoría
            </Button>
            <Button type="button" disabled={activas.length === 0} onClick={() => setAbierta({ tipo: "item" })}>
              Nuevo ítem
            </Button>
          </div>
        ) : null}
      </div>
      {error ? <p role="alert" className="t-caption text-danger-fg">{error}</p> : null}
      {categorias.length === 0 ? (
        <p className="t-body-sm text-fg-muted">
          Aún no hay categorías.{editable ? " Crea la primera: se copia además el catálogo base del rubro." : ""}
        </p>
      ) : null}
      {categorias.filter((c) => verArchivados || c.activa).map((c) => {
        const delGrupo = items.filter((i) => i.categoriaId === c.id && (verArchivados || i.activo));
        return (
          <section key={c.id} className="rounded-lg border border-border">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
              <h3 className="t-label">
                {c.nombre} <span className="t-caption text-fg-muted">· {c.clase}</span>
                {!c.activa ? <Badge tono="neutro" className="ml-2">Archivada</Badge> : null}
              </h3>
              {editable ? (
                <span className="flex gap-1">
                  <Button type="button" variant="ghost" size="md" onClick={() => setAbierta({ tipo: "categoria", categoria: c })}>Editar</Button>
                  <Button type="button" variant="ghost" size="md" disabled={pendiente} onClick={() => void alternarCategoria(c)}>
                    {c.activa ? "Archivar" : "Restaurar"}
                  </Button>
                </span>
              ) : null}
            </header>
            <ul className="divide-y divide-border">
              {delGrupo.length === 0 ? <li className="px-3 py-2 t-caption text-fg-muted">Sin ítems.</li> : null}
              {delGrupo.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="t-body-sm min-w-0">
                    <span className="t-mono text-fg-muted">{i.codigo}</span> · {i.nombre}
                    <span className="t-caption block text-fg-muted">
                      {i.costoUnitarioClp !== undefined ? `${formatearNumero(i.costoUnitarioClp)} CLP · ` : ""}
                      {i.recurrencia === "mensual" ? "Mensual" : "Pago único"}
                      {i.activo ? "" : " · archivado"}
                    </span>
                  </span>
                  {editable ? (
                    <span className="flex gap-1">
                      <Button type="button" variant="ghost" size="md" onClick={() => setAbierta({ tipo: "item", item: i })}>Editar</Button>
                      <Button type="button" variant="ghost" size="md" disabled={pendiente} onClick={() => void alternarItem(i)}>
                        {i.activo ? "Archivar" : "Restaurar"}
                      </Button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {abierta?.tipo === "item" ? <HojaItemCatalogo {...(abierta.item ? { item: abierta.item } : {})} categorias={activas} onCerrar={() => setAbierta(null)} /> : null}
      {abierta?.tipo === "categoria" ? <HojaCategoriaCatalogo {...(abierta.categoria ? { categoria: abierta.categoria } : {})} onCerrar={() => setAbierta(null)} /> : null}
    </div>
  );
}
