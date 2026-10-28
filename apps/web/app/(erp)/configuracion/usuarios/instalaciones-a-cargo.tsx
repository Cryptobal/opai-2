"use client";

import { useCallback, useEffect, useState } from "react";

import { Alerta, avisar, type OpcionCombobox, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { AsignarACargo, type FilaACargo, FilasACargo } from "@/app/_components/alcance/a-cargo";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Asignacion = { membershipId: string; instalaciones: FilaACargo[] };
type InstalacionLista = { items: { id: string; nombre: string; cuenta: string | null }[] };

/**
 * Instalaciones a cargo de un supervisor, en su hoja de Usuarios (CAR-38, Brief 07c bloque 9).
 * Lee y escribe solo por capacidades (`core.supervisores.*`); el filtro del portal lo aplica la
 * consulta de cada capacidad, nunca esta pantalla (ADR-022).
 */
export function InstalacionesACargo({ membershipId }: { membershipId: string }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [asignadas, setAsignadas] = useState<FilaACargo[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [vistas, setVistas] = useState<OpcionCombobox[]>([]);

  useEffect(() => {
    let vigente = true;
    void ejecutarCapacidad("erp", "core.supervisores.list", { membershipId }).then((r) => {
      if (!vigente) return;
      if (r.ok) setAsignadas((r.data as Asignacion).instalaciones);
      else setErrorCarga(r.error.message);
    });
    return () => {
      vigente = false;
    };
  }, [membershipId]);

  const buscar = useCallback(
    async (q: string) => {
      const r = await ejecutarCapacidad("erp", "core.instalaciones.list", {
        ...(q.trim() ? { q: q.trim() } : {}),
        limite: 20,
      });
      if (!r.ok) return [];
      const ya = new Set((asignadas ?? []).map((i) => i.id));
      const opciones = (r.data as InstalacionLista).items
        .filter((i) => !ya.has(i.id))
        .map((i) => ({ valor: i.id, etiqueta: i.nombre, ...(i.cuenta ? { detalle: i.cuenta } : {}) }));
      // Lo visto queda para que los chips de lo elegido muestren el nombre, no el id.
      setVistas((v) => [...v, ...opciones.filter((o) => !v.some((x) => x.valor === o.valor))]);
      return opciones;
    },
    [asignadas],
  );

  async function aplicar(r: Asignacion | null, exito: string) {
    if (!r) return;
    setAsignadas(r.instalaciones);
    setElegidas([]);
    avisar.exito(exito);
  }
  const asignar = async () =>
    aplicar(
      await ejecutar<Asignacion>("core.supervisores.asignar", {
        membershipId,
        instalacionIds: elegidas,
      }),
      "Instalaciones asignadas",
    );
  const quitar = async (id: string) =>
    aplicar(
      await ejecutar<Asignacion>("core.supervisores.quitar", {
        membershipId,
        instalacionIds: [id],
      }),
      "Instalación quitada",
    );

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="t-label mb-1 text-fg">Instalaciones a cargo</legend>
      <p className="t-caption">
        En su portal ve solo las cuentas, instalaciones y personas de estas instalaciones.
      </p>
      {errorCarga ? <Alerta tono="danger" titulo={errorCarga} /> : null}
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {asignadas === null && !errorCarga ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-2/3" />
        </div>
      ) : null}
      {asignadas ? (
        <>
          <FilasACargo
            items={asignadas}
            vacio="Sin instalaciones a cargo: en su portal verá listas vacías."
            pendiente={pendiente}
            onQuitar={(id) => void quitar(id)}
          />
          <AsignarACargo
            id={`a-cargo-${membershipId}`}
            etiqueta="Asignar instalaciones"
            placeholder="Buscar instalación"
            opciones={vistas}
            onBuscar={buscar}
            elegidos={elegidas}
            onCambiar={setElegidas}
            onAsignar={() => void asignar()}
            pendiente={pendiente}
          />
        </>
      ) : null}
    </fieldset>
  );
}
