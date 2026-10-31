"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { useMiembros } from "./use-miembros";

const VACIO = {
  texto: "",
  nombre: "",
  empresa: "",
  email: "",
  telefono: "",
  rut: "",
  servicio: "",
};

/** Registrar solicitud (diseño 06): texto pegado como contenido externo y datos opcionales. */
export function HojaRegistrar() {
  const hoja = useHojaUrl("nueva");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const miembros = useMiembros(hoja.abierta);
  const [d, setD] = useState(VACIO);
  const [responsable, setResponsable] = useState<string | undefined>(undefined);
  const campo = (k: keyof typeof VACIO) => ({
    value: d[k],
    onChange: (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value })),
  });
  async function registrar() {
    const r = await ejecutar<{ id: string }>("comercial.solicitudes.create", {
      textoOriginal: d.texto,
      ...(d.nombre.trim() ? { nombre: d.nombre } : {}),
      ...(d.empresa.trim() ? { empresa: d.empresa } : {}),
      ...(d.email.trim() ? { email: d.email } : {}),
      ...(d.telefono.trim() ? { telefono: d.telefono } : {}),
      ...(d.rut.trim() ? { rut: d.rut } : {}),
      ...(d.servicio.trim() ? { servicio: d.servicio } : {}),
      ...(responsable ? { responsableId: responsable } : {}),
    });
    if (!r) return;
    avisar.exito("Solicitud registrada");
    setD(VACIO);
    hoja.cerrar();
    router.push(`/solicitudes/${r.id}`);
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Registrar solicitud"
      descripcion="Copia el mensaje (por ejemplo desde WhatsApp) y pégalo abajo. Entra como «nueva»."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || !d.texto.trim()} onClick={() => void registrar()}>
            {pendiente ? "Guardando…" : "Registrar solicitud"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo
          etiqueta="Mensaje"
          htmlFor="sol-texto"
          ayuda="Se guarda tal cual, como contenido externo."
        >
          <Textarea id="sol-texto" rows={6} maxLength={20000} {...campo("texto")} />
        </Campo>
        <Campo etiqueta="Nombre" htmlFor="sol-nombre">
          <Input id="sol-nombre" maxLength={160} {...campo("nombre")} />
        </Campo>
        <Campo etiqueta="Empresa" htmlFor="sol-empresa">
          <Input id="sol-empresa" maxLength={160} {...campo("empresa")} />
        </Campo>
        <Campo etiqueta="Correo" htmlFor="sol-email">
          <Input id="sol-email" type="email" maxLength={200} {...campo("email")} />
        </Campo>
        <Campo etiqueta="Teléfono" htmlFor="sol-telefono">
          <Input id="sol-telefono" type="tel" maxLength={30} {...campo("telefono")} />
        </Campo>
        <Campo etiqueta="RUT" htmlFor="sol-rut">
          <Input id="sol-rut" maxLength={14} {...campo("rut")} />
        </Campo>
        <Campo etiqueta="Servicio que pide" htmlFor="sol-servicio">
          <Input id="sol-servicio" maxLength={160} {...campo("servicio")} />
        </Campo>
        {miembros.length ? (
          <Campo etiqueta="Responsable" htmlFor="sol-responsable" ayuda="Opcional.">
            <Select
              id="sol-responsable"
              valor={responsable}
              onCambiar={setResponsable}
              placeholder="Sin asignar"
              opciones={miembros}
            />
          </Campo>
        ) : null}
      </div>
    </Sheet>
  );
}
