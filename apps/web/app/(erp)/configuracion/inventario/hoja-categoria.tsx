"use client";

import { useState } from "react";

import { Alerta, avisar, Campo, Input, Select, Sheet, Switch } from "@opai/ds";

import { AccionesHoja } from "@/app/(erp)/inventario/_componentes/acciones-hoja";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { proximasCategorias } from "./guardar-listas";
import type { CategoriaConfig } from "./tipos";

const COMPORTAMIENTOS = [
  { valor: "activo", etiqueta: "Activo (por unidad)" },
  { valor: "ropa", etiqueta: "Ropa (por talla)" },
];

export function HojaCategoria({
  todas,
  categoria,
}: {
  todas: CategoriaConfig[];
  categoria?: CategoriaConfig;
}) {
  const hoja = useHojaUrl(categoria ? "editar" : "nuevo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [comportamiento, setComportamiento] = useState<CategoriaConfig["comportamiento"]>(
    categoria?.comportamiento ?? "activo",
  );
  const [activo, setActivo] = useState(categoria?.activo ?? true);
  const bloqueada = categoria?.clave === "activo" || categoria?.clave === "ropa";

  async function guardar() {
    const proximas = proximasCategorias(todas, categoria ?? null, { nombre, comportamiento, activo });
    const r = await ejecutar("inventario.config.categorias_guardar", {
      categorias: proximas.map((c, orden) => ({
        clave: c.clave || undefined,
        nombre: c.nombre,
        comportamiento: c.comportamiento,
        activo: c.activo,
        orden,
      })),
    });
    if (!r) return;
    avisar.exito(categoria ? "Categoría actualizada" : "Categoría agregada");
    hoja.cerrar();
  }

  return (
    <Sheet
      abierto={categoria ? hoja.valor === categoria.clave : hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={categoria ? "Editar categoría" : "Nueva categoría"}
      acciones={
        <AccionesHoja
          onCancelar={hoja.cerrar}
          onGuardar={() => void guardar()}
          listo={nombre.trim().length >= 2}
          pendiente={pendiente}
          texto="Guardar"
        />
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Nombre" htmlFor="ic-nombre">
          <Input id="ic-nombre" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Comportamiento" htmlFor="ic-comportamiento">
          <Select
            id="ic-comportamiento"
            valor={comportamiento}
            opciones={COMPORTAMIENTOS}
            onCambiar={(v) => setComportamiento(v as CategoriaConfig["comportamiento"])}
            disabled={bloqueada}
          />
        </Campo>
        {categoria ? <Switch etiqueta="Activa" activo={activo} onCambiar={setActivo} /> : null}
      </div>
    </Sheet>
  );
}