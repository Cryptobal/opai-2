"use client";

import { useState } from "react";

import { Alerta, avisar, Campo, Input, Sheet, Switch } from "@opai/ds";

import { AccionesHoja } from "@/app/(erp)/inventario/_componentes/acciones-hoja";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { proximasPrendas } from "./guardar-listas";
import type { PrendaConfig } from "./tipos";

/** Edita una prenda del uniforme y guarda la lista completa (clave estable al renombrar). */
export function HojaPrenda({
  todas,
  prenda,
}: {
  todas: PrendaConfig[];
  prenda?: PrendaConfig;
}) {
  const hoja = useHojaUrl(prenda ? "editar" : "nuevo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(prenda?.nombre ?? "");
  const [activo, setActivo] = useState(prenda?.activo ?? true);

  async function guardar() {
    const proximas = proximasPrendas(
      todas,
      prenda ? { clave: prenda.clave, nombre: prenda.nombre, activo: prenda.activo } : null,
      nombre,
      activo,
    );
    const r = await ejecutar("inventario.config.prendas_guardar", {
      prendas: proximas.map((p, orden) => ({
        clave: p.clave || undefined,
        nombre: p.nombre,
        activo: p.activo,
        orden,
      })),
    });
    if (!r) return;
    avisar.exito(prenda ? "Prenda actualizada" : "Prenda agregada");
    hoja.cerrar();
  }

  return (
    <Sheet
      abierto={prenda ? hoja.valor === prenda.clave : hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={prenda ? "Editar prenda" : "Nueva prenda"}
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
        {prenda?.enUso ? (
          <Alerta tono="info" titulo="Prenda en uso">
            La clave se conserva al renombrar para no perder tallas ni tipos de inventario ligados.
          </Alerta>
        ) : null}
        <Campo etiqueta="Nombre" htmlFor="pi-nombre">
          <Input id="pi-nombre" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        {prenda ? (
          <Switch etiqueta="Activa en el uniforme" activo={activo} onCambiar={setActivo} />
        ) : null}
      </div>
    </Sheet>
  );
}