"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alerta, avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CamposGenerales } from "./campos-generales";
import { CamposLineas } from "./campos-lineas";
import { aInput } from "./conversion";
import { FORM_VACIO, type FormProgramacion } from "./tipos";

type Contacto = { id: string; nombres: string; apellidos: string; email: string | null };
type Props = {
  cuentas: { id: string; nombre: string; rut: string | null }[];
  inicial?: FormProgramacion;
  programacionId?: string;
};

/** Crear o editar una programación (BRIEF-26). Guarda pausada; se activa desde la ficha. */
export function FormularioProgramacion({ cuentas, inicial, programacionId }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [f, setF] = useState<FormProgramacion>(inicial ?? FORM_VACIO);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [invalido, setInvalido] = useState<string | null>(null);
  const set = (c: Partial<FormProgramacion>) => setF((prev) => ({ ...prev, ...c }));

  useEffect(() => {
    if (!f.cuentaId) return;
    void ejecutar("core.contactos.list", { cuentaId: f.cuentaId }, false, "ninguna").then((r) => {
      if (Array.isArray(r)) setContactos(r as Contacto[]);
    });
    // `ejecutar` es estable por render del hook; solo recargar al cambiar de cliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.cuentaId]);

  async function guardar() {
    const r = aInput(f);
    if (!r.ok) {
      setInvalido(r.error);
      return;
    }
    setInvalido(null);
    const res = programacionId
      ? await ejecutar<{ id: string }>("finanzas.ventas_programacion.actualizar", {
          ...r.input,
          programacionId,
        })
      : await ejecutar<{ id: string }>("finanzas.ventas_programacion.crear", r.input);
    if (res) {
      avisar.exito(programacionId ? "Programación actualizada" : "Programación creada (pausada)");
      router.push(`/finanzas/ventas/programacion/${res.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-28 md:pb-0">
      <CamposGenerales f={f} set={set} cuentas={cuentas} editando={Boolean(programacionId)} />
      <CamposLineas
        f={f}
        set={set}
        contactos={contactos.map((c) => ({
          id: c.id,
          nombre: `${c.nombres} ${c.apellidos}`.trim(),
          email: c.email,
        }))}
      />
      {invalido || error ? (
        <Alerta tono="danger" titulo="Revisa el formulario">
          {invalido ?? error}
        </Alerta>
      ) : null}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-border bg-bg px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:p-0">
        <Button variant="secondary" onClick={() => router.back()} disabled={pendiente}>
          Cancelar
        </Button>
        <Button block onClick={() => void guardar()} disabled={pendiente}>
          {programacionId ? "Guardar cambios" : "Crear programación"}
        </Button>
      </div>
    </div>
  );
}
