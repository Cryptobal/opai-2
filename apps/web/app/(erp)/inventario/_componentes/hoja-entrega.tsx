"use client";

import { useCallback, useEffect, useState } from "react";

import { Alerta, avisar, Campo, Combobox, Input, Segmentado, Select, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { AccionesHoja } from "./acciones-hoja";
import type { Opcion, Prenda } from "./tipos";

type Opciones = { activos: Opcion[]; ropa: Prenda[]; destinos: Opcion[] };
type Estado = { clase: "activo" | "ropa"; activoId: string; tipoId: string; talla: string; cantidad: string; destino: string; nota: string };

/** Destino y nota comunes a las dos entregas (R19). */
function comunes(e: Estado) {
  const [clave, id] = e.destino.split(":");
  return { ...(clave === "persona" ? { personaId: id } : { instalacionId: id }), ...(e.nota.trim() ? { nota: e.nota.trim() } : {}) };
}

/** CAR-504: con ropa y una persona elegidas, propone la talla de su ficha si hay existencias de ella. */
function useTallaDeFicha(e: Estado, ropa: Prenda[], proponer: (talla: string) => void) {
  const { ejecutar } = useCapacidad("erp");
  const [ficha, setFicha] = useState<{ de: string; talla: string } | null>(null);
  const [clave, personaId] = e.destino.split(":");
  const tipoId = e.clase === "ropa" ? e.tipoId : "";
  const de = `${tipoId}:${personaId}`;
  useEffect(() => {
    if (!tipoId || clave !== "persona" || !personaId) return;
    let vigente = true;
    void ejecutar<{ talla: string | null }>("inventario.entregas.talla_persona", { tipoId, personaId }, false, "ninguna").then((r) => {
      if (!vigente || !r?.talla) return;
      setFicha({ de: `${tipoId}:${personaId}`, talla: r.talla });
      const hay = ropa.find((p) => p.tipoId === tipoId)?.existencias.some((x) => x.talla === r.talla && x.cantidad > 0);
      if (hay) proponer(r.talla);
    });
    return () => {
      vigente = false;
    };
  }, [ejecutar, tipoId, clave, personaId, ropa, proponer]);
  // Solo vale la respuesta de la prenda y la persona elegidas ahora.
  return ficha?.de === de ? ficha.talla : null;
}

/** Nueva entrega (CAR-238): un activo disponible o unidades de una talla de ropa, a una persona o una instalación. */
export function HojaEntrega({ opciones }: { opciones: Opciones }) {
  const hoja = useHojaUrl("nueva");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [e, setE] = useState<Estado>({ clase: "activo", activoId: "", tipoId: "", talla: "", cantidad: "1", destino: "", nota: "" });
  const fijar = useCallback((p: Partial<Estado>) => setE((x) => ({ ...x, ...p })), []);
  // La propuesta nunca pisa una talla que la persona ya eligió.
  const proponer = useCallback((talla: string) => setE((x) => (x.talla ? x : { ...x, talla })), []);
  const deFicha = useTallaDeFicha(e, opciones.ropa, proponer);
  const prenda = opciones.ropa.find((p) => p.tipoId === e.tipoId);
  const stock = prenda?.existencias.find((x) => x.talla === e.talla)?.cantidad ?? 0;
  const cantidad = Number(e.cantidad);
  const itemListo = e.clase === "activo" ? e.activoId !== "" : e.talla !== "" && cantidad > 0 && cantidad <= stock;

  async function guardar() {
    const r =
      e.clase === "activo"
        ? await ejecutar("inventario.entregas.entregar_activo", { activoId: e.activoId, ...comunes(e) })
        : await ejecutar("inventario.entregas.entregar_ropa", { tipoId: e.tipoId, talla: e.talla, cantidad, ...comunes(e) });
    if (!r) return;
    avisar.exito("Entrega registrada");
    hoja.cerrar();
  }

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Nueva entrega"
      acciones={<AccionesHoja onCancelar={hoja.cerrar} onGuardar={() => void guardar()} listo={itemListo && e.destino !== ""} pendiente={pendiente} texto="Entregar" />}
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Segmentado
          etiqueta="Qué se entrega"
          activa={e.clase}
          opciones={[
            { id: "activo", etiqueta: "Activo", onClick: () => fijar({ clase: "activo" }) },
            { id: "ropa", etiqueta: "Ropa", onClick: () => fijar({ clase: "ropa" }) },
          ]}
        />
        {e.clase === "activo" ? (
          <Campo etiqueta="Activo disponible" htmlFor="en-activo">
            <Combobox id="en-activo" opciones={opciones.activos} valor={e.activoId} onCambiar={(v) => fijar({ activoId: v[0] ?? "" })} placeholder="Buscar por código" />
          </Campo>
        ) : (
          <CamposRopa e={e} fijar={fijar} ropa={opciones.ropa} stock={stock} deFicha={deFicha} />
        )}
        <Campo etiqueta="Entregar a" htmlFor="en-destino">
          <Combobox id="en-destino" opciones={opciones.destinos} valor={e.destino} onCambiar={(v) => fijar({ destino: v[0] ?? "" })} placeholder="Persona o instalación" />
        </Campo>
        <Campo etiqueta="Nota" htmlFor="en-nota">
          <Input id="en-nota" value={e.nota} onChange={(x) => fijar({ nota: x.target.value })} />
        </Campo>
      </div>
    </Sheet>
  );
}

type PropsRopa = { e: Estado; fijar: (p: Partial<Estado>) => void; ropa: Prenda[]; stock: number; deFicha: string | null };

function CamposRopa({ e, fijar, ropa, stock, deFicha }: PropsRopa) {
  const prenda = ropa.find((p) => p.tipoId === e.tipoId);
  return (
    <>
      <Campo etiqueta="Prenda" htmlFor="en-prenda">
        <Select id="en-prenda" valor={e.tipoId} onCambiar={(v) => fijar({ tipoId: v, talla: "" })} opciones={ropa.map((p) => ({ valor: p.tipoId, etiqueta: p.nombre }))} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Talla" htmlFor="en-talla" {...(deFicha ? { ayuda: `En su ficha: ${deFicha}` } : {})}>
          <Select
            id="en-talla"
            valor={e.talla}
            onCambiar={(v) => fijar({ talla: v })}
            opciones={(prenda?.existencias ?? []).map((x) => ({ valor: x.talla, etiqueta: `${x.talla} (${x.cantidad})` }))}
          />
        </Campo>
        <Campo etiqueta="Cantidad" htmlFor="en-cantidad" {...(e.talla ? { ayuda: `Hay ${stock}` } : {})}>
          <Input id="en-cantidad" inputMode="numeric" value={e.cantidad} onChange={(x) => fijar({ cantidad: x.target.value.replace(/\D/g, "") })} />
        </Campo>
      </div>
    </>
  );
}
