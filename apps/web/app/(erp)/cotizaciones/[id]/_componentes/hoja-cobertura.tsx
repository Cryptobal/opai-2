"use client";

import { useEffect, useMemo, useState } from "react";

import { Alerta, avisar, Button, Campo, Segmentado, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { type AjusteTramo, type BorradorCobertura, entradaCobertura } from "@/lib/cobertura-entrada";
import { pesos } from "@/lib/fechas";

import { AjusteCobertura, type CargoCobertura } from "./campos-cobertura";

type Tramo = { id: string; nombre: string; patronNombre: string; horaInicio: string; horaFin: string; posiciones: number };
type Esquema = { id: string; nombre: string; totalPuestos: number; tramos: Tramo[] };
const VACIO: AjusteTramo = { cargoId: "", sueldo: "" };

/** Hoja «Agregar cobertura»: un esquema crea todos sus puestos de una vez, con vista previa (CAR-212). */
export function HojaCobertura({
  seccionId,
  verCostos,
  onCerrar,
  onListo,
}: {
  seccionId: string;
  verCostos: boolean;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [esquemas, setEsquemas] = useState<Esquema[] | null>(null);
  const [cargos, setCargos] = useState<CargoCobertura[]>([]);
  const [b, setB] = useState<BorradorCobertura>({ seccionId, esquemaId: "", modo: "todos", todos: VACIO, porTramo: {} });
  const [venta, setVenta] = useState<number | null>(null);
  useEffect(() => {
    void ejecutar<{ items: Esquema[] }>("cpq.esquemas_cobertura.list", {}, false, "ninguna").then((r) => setEsquemas(r?.items ?? []));
    void ejecutar<{ items: CargoCobertura[] }>("cpq.sueldos_referencia.list", {}, false, "ninguna").then((r) => r && setCargos(r.items));
  }, [ejecutar]);
  const esquema = esquemas?.find((e) => e.id === b.esquemaId);
  const entrada = useMemo(() => entradaCobertura(b, verCostos), [b, verCostos]);
  useEffect(() => {
    if (!b.esquemaId) return;
    void ejecutar<{ ventaMensualClp: number | null }>("cpq.lineas.agregar_esquema", entrada, true, "ninguna").then((r) => setVenta(r?.ventaMensualClp ?? null));
  }, [b.esquemaId, entrada, ejecutar]);

  async function confirmar() {
    if (!esquema) return;
    const r = await ejecutar("cpq.lineas.agregar_esquema", entrada);
    if (r != null) {
      avisar.exito(`Se crearon ${esquema.totalPuestos} puestos`);
      onListo();
      onCerrar();
    }
  }
  const ajusteDe = (t: Tramo) => b.porTramo[t.id] ?? VACIO;

  return (
    <Sheet
      abierto
      titulo="Agregar cobertura"
      onCerrar={onCerrar}
      acciones={
        <>
          <Button type="button" variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="button" disabled={pendiente || !esquema} onClick={() => void confirmar()}>
            {esquema ? `Confirmar y crear ${esquema.totalPuestos} puestos` : "Confirmar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-4">
        {esquemas && esquemas.length === 0 ? (
          <Alerta tono="info" titulo="Aún no hay esquemas de cobertura. Pídele a un administrador que cree esquemas en Configuración › CPQ › Catálogo." />
        ) : (
          <Campo etiqueta="Esquema" htmlFor="cob-esquema">
            <Select
              id="cob-esquema"
              valor={b.esquemaId || undefined}
              placeholder="Elige un esquema"
              opciones={(esquemas ?? []).map((e) => ({ valor: e.id, etiqueta: e.nombre, descripcion: `${e.totalPuestos} puestos` }))}
              onCambiar={(v) => setB((x) => ({ ...x, esquemaId: v, porTramo: {} }))}
            />
          </Campo>
        )}
        {esquema ? (
          <>
            <Segmentado
              etiqueta="Cargo"
              activa={b.modo}
              opciones={[
                { id: "todos", etiqueta: "Uno para todos", onClick: () => setB((x) => ({ ...x, modo: "todos" })) },
                { id: "tramo", etiqueta: "Uno por tramo", onClick: () => setB((x) => ({ ...x, modo: "tramo" })) },
              ]}
            />
            {b.modo === "todos" ? (
              <AjusteCobertura id="cob-todos" valor={b.todos} cargos={cargos} verCostos={verCostos} onCambiar={(a) => setB((x) => ({ ...x, todos: a }))} />
            ) : (
              esquema.tramos.map((t) => (
                <AjusteCobertura
                  key={t.id}
                  id={`cob-${t.id}`}
                  titulo={t.nombre}
                  valor={ajusteDe(t)}
                  cargos={cargos}
                  verCostos={verCostos}
                  onCambiar={(a) => setB((x) => ({ ...x, porTramo: { ...x.porTramo, [t.id]: a } }))}
                />
              ))
            )}
            <section aria-label="Vista previa" className="space-y-2 rounded-md border border-border p-3">
              <h4 className="t-label">Vista previa</h4>
              <p className="t-body-sm">Se crearán {esquema.totalPuestos} puestos en esta sección.</p>
              <ul className="space-y-1">
                {esquema.tramos.map((t) => (
                  <li key={t.id} className="t-caption text-fg-muted">
                    {t.nombre} · {t.posiciones} {t.posiciones === 1 ? "puesto" : "puestos"} · {t.patronNombre} · {t.horaInicio}–{t.horaFin}
                  </li>
                ))}
              </ul>
              {verCostos && b.esquemaId && venta != null ? <p className="t-label tabular-nums">Total mensual de la venta: {pesos(venta)}</p> : null}
              <p className="t-caption text-fg-muted">Se crea todo de una vez; si algo falla no queda nada a medias.</p>
            </section>
          </>
        ) : null}
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </div>
    </Sheet>
  );
}
