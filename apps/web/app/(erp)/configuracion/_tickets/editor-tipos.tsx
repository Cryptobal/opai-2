"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Campo, Input, SeccionTarjeta, Select, Switch } from "@opai/ds";
import { ROLES } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";
import type { TipoTicket } from "@/app/(erp)/tickets/_componentes/datos";

const ROLES_OPCIONES = ROLES.map((r) => ({ valor: r, etiqueta: r }));

/**
 * Tipos de ticket: agregar (dueño por defecto = un rol, aprobación opcional con su rol aprobador,
 * SLA opcional) y activar o desactivar con `tickets.tipos.crear/actualizar`. Un tipo no se borra:
 * se desactiva y deja de ofrecerse; los tickets ya creados lo conservan.
 */
export function EditorTipos({ tipos }: { tipos: TipoTicket[] }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("supervisor");
  const [aprueba, setAprueba] = useState(false);
  const [aprobador, setAprobador] = useState("admin");
  const [sla, setSla] = useState("");

  async function agregar() {
    const horas = sla.trim() === "" ? undefined : Number(sla);
    const r = await ejecutar("tickets.tipos.crear", {
      nombre: nombre.trim(),
      responsableDefectoTipo: "rol",
      responsableDefectoRol: rol,
      requiereAprobacion: aprueba,
      ...(aprueba ? { aprobadorRol: aprobador } : {}),
      ...(horas ? { slaHoras: horas } : {}),
    });
    if (r) {
      avisar.exito("Tipo de ticket agregado");
      setNombre("");
      setSla("");
    }
  }

  return (
    <SeccionTarjeta titulo="Tipos de ticket" sinRelleno>
      <p className="t-caption px-4 pt-3">
        Cada tipo define quién es el responsable al crear y si exige aprobación. El SLA es opcional y
        está apagado salvo que lo enciendas. Los inactivos no se ofrecen al crear.
      </p>
      {error ? <Alerta tono="danger" titulo={error} className="mx-4 mt-3" /> : null}
      <ul className="flex flex-col">
        {tipos.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
            <span className={`min-w-0 flex-1 truncate ${t.activo ? "" : "text-fg-subtle"}`}>{t.nombre}</span>
            {t.requiereAprobacion ? <Badge tono="info">Con aprobación</Badge> : null}
            {t.slaHoras ? <Badge tono="neutro">{`SLA ${t.slaHoras} h`}</Badge> : null}
            <Switch
              soloControl
              etiqueta={`${t.nombre} activo`}
              activo={t.activo}
              disabled={pendiente}
              onCambiar={(activo) => void ejecutar("tickets.tipos.actualizar", { id: t.id, activo })}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 p-4">
        <Campo etiqueta="Nombre del nuevo tipo" htmlFor="tt-nombre">
          <Input id="tt-nombre" maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <div className="flex flex-wrap gap-3">
          <Campo etiqueta="Responsable por defecto (rol)" htmlFor="tt-rol">
            <Select valor={rol} opciones={ROLES_OPCIONES} onCambiar={setRol} />
          </Campo>
          <Campo etiqueta="SLA en horas (opcional)" htmlFor="tt-sla">
            <Input id="tt-sla" inputMode="numeric" value={sla} onChange={(e) => setSla(e.target.value.replace(/\D/g, ""))} />
          </Campo>
        </div>
        <Switch etiqueta="Exige aprobación" activo={aprueba} onCambiar={setAprueba} />
        {aprueba ? (
          <Campo etiqueta="Rol que aprueba" htmlFor="tt-aprueba">
            <Select valor={aprobador} opciones={ROLES_OPCIONES} onCambiar={setAprobador} />
          </Campo>
        ) : null}
        <Button variant="secondary" disabled={pendiente || nombre.trim().length < 2} onClick={() => void agregar()}>
          Agregar tipo
        </Button>
      </div>
    </SeccionTarjeta>
  );
}
