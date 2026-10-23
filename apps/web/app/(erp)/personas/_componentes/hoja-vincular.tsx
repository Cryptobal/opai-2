"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Combobox, Dialog, type OpcionCombobox } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Miembro = { userId: string; nombre: string; email: string; estado: string };

/** Vincular la persona con un usuario de OPAI (portal Trabajador); sugiere el de su mismo correo. */
export function HojaVincularUsuario({
  personaId,
  email,
}: {
  personaId: string;
  email: string | null;
}) {
  const hoja = useHojaUrl("vincular");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [opciones, setOpciones] = useState<OpcionCombobox[] | null>(null);
  const [usuario, setUsuario] = useState<string | null>(null);
  useEffect(() => {
    if (!hoja.abierta) return;
    let vigente = true;
    void ejecutarCapacidad("erp", "core.users.list", {}).then((r) => {
      if (!vigente) return;
      const activos = r.ok ? (r.data as Miembro[]).filter((m) => m.estado === "activa") : [];
      setOpciones(activos.map((m) => ({ valor: m.userId, etiqueta: m.nombre, detalle: m.email })));
      setUsuario(activos.find((m) => email && m.email === email)?.userId ?? null);
    });
    return () => {
      vigente = false;
    };
  }, [hoja.abierta, email]);
  async function vincular() {
    if (!usuario) return;
    const r = await ejecutar("core.personas.vincular_usuario", {
      id: personaId,
      usuarioId: usuario,
    });
    if (!r) return;
    avisar.exito("Usuario vinculado");
    hoja.cerrar();
  }
  return (
    <Dialog
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Vincular usuario"
      descripcion="La persona entrará al portal Trabajador con este usuario. Si aún no existe, invítalo en Configuración → Usuarios."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={!usuario || pendiente} onClick={() => void vincular()}>
            {pendiente ? "Vinculando…" : "Vincular"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Usuario" htmlFor="vincular-usuario">
          <Combobox
            id="vincular-usuario"
            opciones={opciones ?? []}
            valor={usuario}
            onCambiar={(v) => setUsuario(v[0] ?? null)}
            placeholder={opciones ? "Buscar por nombre o correo" : "Cargando usuarios…"}
          />
        </Campo>
      </div>
    </Dialog>
  );
}
