"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { useHojaUrl, useParametros } from "@/app/_components/maestros/use-url";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import { CamposCuenta, type DatosCuenta, inicialCuenta, invalidoCuenta } from "./campos-cuenta";

/** Nueva cuenta (05) o editar (Sheet lateral en md+, pantalla completa en teléfono). */
export function HojaCuenta({ cuenta }: { cuenta?: CuentaDetalle }) {
  const hoja = useHojaUrl(cuenta ? "editar" : "nueva");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const { valor } = useParametros();
  // "Crear «Logística Andina»" desde el selector de cuentas llega con ?nombre=.
  const [d, setD] = useState<DatosCuenta>(() => ({
    ...inicialCuenta(cuenta),
    ...(!cuenta && valor("nombre") ? { nombre: valor("nombre") ?? "" } : {}),
  }));
  const invalido = invalidoCuenta(d);
  async function guardar() {
    const campos = {
      nombre: d.nombre.trim(),
      razonSocial: d.razonSocial.trim() || null,
      rut: d.rut.trim() || null,
      giro: d.giro.trim() || null,
      origen: d.origen || null,
      sitioWeb: d.sitioWeb.trim() || null,
      calle: d.direccion?.calle ?? null,
      comuna: d.direccion?.comuna ?? null,
      region: d.direccion?.region ?? null,
      escrituraFecha: d.escrituraFecha || null,
      escrituraNotaria: d.escrituraNotaria.trim() || null,
    };
    const r = await ejecutar<{ id: string; sii?: string }>(
      cuenta ? "core.cuentas.update" : "core.cuentas.create",
      cuenta ? { id: cuenta.id, ...campos } : campos,
    );
    if (!r) return;
    if (d.representante.nombre.trim() && d.representante.rut.trim()) {
      await ejecutar("core.cuentas.set_representantes", {
        cuentaId: r.id,
        representantes: [
          { nombre: d.representante.nombre.trim(), rut: d.representante.rut.trim() },
        ],
      });
    }
    if (!cuenta && d.estado !== "prospecto")
      await ejecutar("core.cuentas.set_estado", { id: r.id, estado: d.estado });
    avisar.exito(cuenta ? "Cuenta actualizada" : "Cuenta creada");
    hoja.cerrar();
    // Con RUT y el SII disponible, la ficha nueva abre «Datos del SII» para elegir campo por campo
    // (CAR-156); nada se aplica sin esa elección.
    const ofrecerSii = r.sii === "en_cache" || r.sii === "en_cola";
    if (!cuenta) router.push(`/cuentas/${r.id}${ofrecerSii ? "?sii=1" : ""}`);
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={cuenta ? "Editar cuenta" : "Nueva cuenta"}
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || invalido} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : cuenta ? "Guardar" : "Crear cuenta"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposCuenta d={d} setD={setD} nueva={!cuenta} />
      </div>
    </Sheet>
  );
}
