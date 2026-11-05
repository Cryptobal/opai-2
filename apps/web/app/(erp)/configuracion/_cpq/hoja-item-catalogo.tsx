"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, InputMonto, Segmentado, Select, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { CategoriaCatalogo, ItemCatalogo } from "./catalogo-tipos";

/** Hoja para crear o editar un ítem del catálogo de CPQ (`cpq.catalogo_items.create|update`). */
export function HojaItemCatalogo({
  item,
  categorias,
  onCerrar,
}: {
  item?: ItemCatalogo;
  categorias: readonly CategoriaCatalogo[];
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const verCosto = !item || item.costoUnitarioClp !== undefined;
  const [codigo, setCodigo] = useState(item?.codigo ?? "");
  const [nombre, setNombre] = useState(item?.nombre ?? "");
  const [categoriaId, setCategoriaId] = useState(item?.categoriaId ?? categorias[0]?.id ?? "");
  const [unidad, setUnidad] = useState(item?.unidad ?? "unidad");
  const [costo, setCosto] = useState(String(item?.costoUnitarioClp ?? 0));
  const [recurrencia, setRecurrencia] = useState<"mensual" | "unico">(item?.recurrencia ?? "mensual");
  const [visible, setVisible] = useState(item?.visibleCliente ?? true);
  const [porDefecto, setPorDefecto] = useState(item?.porDefecto ?? false);
  const valido = nombre.trim() !== "" && categoriaId !== "" && (item !== undefined || codigo.trim() !== "");

  async function guardar() {
    const comun = {
      nombre: nombre.trim(),
      categoriaId,
      unidad: unidad.trim() || "unidad",
      recurrencia,
      visibleCliente: visible,
      porDefecto,
      ...(verCosto ? { costoUnitarioClp: Number.parseInt(costo, 10) || 0 } : {}),
    };
    const r = item
      ? await ejecutar("cpq.catalogo_items.update", { id: item.id, ...comun })
      : await ejecutar("cpq.catalogo_items.create", { codigo: codigo.trim(), ...comun });
    if (r != null) {
      avisar.exito(item ? "Ítem actualizado" : "Ítem creado");
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      titulo={item ? "Editar ítem" : "Nuevo ítem"}
      onCerrar={onCerrar}
      acciones={
        <>
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente || !valido} onClick={() => void guardar()}>
            {item ? "Guardar" : "Crear"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Campo etiqueta="Código" htmlFor="cat-codigo" ayuda={item ? "El código no se cambia." : "Identificador corto, único en la empresa."}>
          <Input id="cat-codigo" value={codigo} readOnly={Boolean(item)} onChange={(e) => setCodigo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Nombre" htmlFor="cat-nombre">
          <Input id="cat-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Categoría" htmlFor="cat-categoria">
          <Select id="cat-categoria" valor={categoriaId} onCambiar={setCategoriaId} opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))} />
        </Campo>
        <Campo etiqueta="Unidad" htmlFor="cat-unidad">
          <Input id="cat-unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} />
        </Campo>
        {verCosto ? (
          <Campo etiqueta="Costo unitario (CLP)" htmlFor="cat-costo">
            <InputMonto id="cat-costo" valor={costo} onCambiar={setCosto} />
          </Campo>
        ) : null}
        <Segmentado
          etiqueta="Recurrencia"
          activa={recurrencia}
          opciones={[
            { id: "mensual", etiqueta: "Mensual", onClick: () => setRecurrencia("mensual") },
            { id: "unico", etiqueta: "Pago único", onClick: () => setRecurrencia("unico") },
          ]}
        />
        <Switch etiqueta="Visible para el cliente" descripcion="Aparece en el PDF de la cotización." activo={visible} onCambiar={setVisible} />
        <Switch etiqueta="Incluido por defecto" descripcion="Se agrega solo en cotizaciones nuevas." activo={porDefecto} onCambiar={setPorDefecto} />
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </div>
    </Sheet>
  );
}
