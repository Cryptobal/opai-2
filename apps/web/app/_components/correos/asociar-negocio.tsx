"use client";

import { useState } from "react";

import { avisar, Button, Campo, Dialog, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { type Opcion, opcionesDeCuenta } from "@/app/(erp)/configuracion/correos-clientes/opciones-cuenta";

/** Deja asociar un correo de la ficha a un negocio de la misma cuenta (`core.correos.asociar`, CAR-302). */
export function AsociarNegocio(p: { correoId: string; cuentaId: string; contactoId: string | null }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  const [negocios, setNegocios] = useState<Opcion[] | null>(null);
  const [negocioId, setNegocioId] = useState("");
  async function abrir() {
    setAbierto(true);
    if (negocios) return;
    setNegocios((await opcionesDeCuenta(p.cuentaId)).negocios);
  }
  async function asociar() {
    const input = { correoId: p.correoId, cuentaId: p.cuentaId, negocioId, ...(p.contactoId ? { contactoId: p.contactoId } : {}) };
    if (await ejecutar("core.correos.asociar", input)) {
      setAbierto(false);
      avisar.exito("Correo asociado al negocio: ya aparece en su ficha");
    }
  }
  const cerrar = () => {
    setAbierto(false);
    limpiarError();
  };
  return (
    <>
      <Button variant="ghost" onClick={() => void abrir()}>
        Asociar a un negocio
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Asociar a un negocio"
        descripcion="El correo seguirá en la cuenta y además aparecerá en la ficha del negocio."
        acciones={
          <>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button disabled={pendiente || !negocioId} onClick={() => void asociar()}>
              Asociar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Campo etiqueta="Negocio" htmlFor={`asociar-neg-${p.correoId}`}>
            <Select
              id={`asociar-neg-${p.correoId}`}
              valor={negocioId}
              onCambiar={setNegocioId}
              opciones={negocios ?? []}
              placeholder={negocios === null ? "Cargando…" : negocios.length ? "Elige un negocio" : "La cuenta no tiene negocios"}
              disabled={pendiente || !negocios?.length}
            />
          </Campo>
          {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
        </div>
      </Dialog>
    </>
  );
}
