"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { EntradaCatalogo } from "../../facturacion/_componentes/cobro";
import { CamposCondicion } from "../../tenants/[id]/cobro/campos-condicion";
import { formulario, type Formulario } from "../../tenants/[id]/cobro/vista-previa-cobro";

const entrada = (moduloId: string, f: Formulario | null) => ({
  moduloId,
  precio: f
    ? {
        moneda: f.moneda,
        forma: f.forma,
        unidad: f.forma === "por_unidad" ? f.unidad || null : null,
        precio: f.precio,
        minimoMensual: f.minimo || null,
      }
    : null,
});

/**
 * Hoja «Precio de lista» de un cobrable: reutiliza los campos de la condición de empresa (solo
 * moneda, forma, unidad, precio y mínimo). Parte de la forma y unidad sugeridas si aún no hay precio.
 */
export function HojaPrecioLista(props: { entrada: EntradaCatalogo; onCerrar: () => void }) {
  const { entrada: e, onCerrar } = props;
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [f, setF] = useState<Formulario>(() =>
    formulario(
      null,
      e.precioLista ?? {
        moneda: "UF",
        forma: e.formaSugerida ?? "fijo",
        unidad: e.unidadSugerida,
        precio: 0,
        minimoMensual: null,
      },
    ),
  );
  const [quitar, setQuitar] = useState(false);
  const listo = Boolean(f.precio && (f.forma === "fijo" || f.unidad));

  async function correr(conPrecio: boolean) {
    const r = await ejecutar("platform.catalogo.precio_set", entrada(e.id, conPrecio ? f : null));
    if (r) {
      avisar.exito(conPrecio ? "Precio de lista guardado" : "Precio de lista quitado");
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={`Precio de lista de ${e.nombre}`}
      descripcion="Rellena la hoja «Cobro» de una empresa al fijarle el precio. No cambia las condiciones ya pactadas ni los cargos generados."
      acciones={
        <>
          {e.precioLista ? (
            <Button
              variant={quitar ? "destructive" : "ghost"}
              disabled={pendiente}
              onClick={() => (quitar ? void correr(false) : setQuitar(true))}
            >
              {quitar ? "Confirmar: quitar el precio de lista" : "Quitar precio de lista"}
            </Button>
          ) : null}
          <Button disabled={pendiente || !listo} onClick={() => void correr(true)}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposCondicion f={f} setF={setF} soloPrecio />
      </div>
    </Sheet>
  );
}
