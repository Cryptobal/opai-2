"use client";

import { useState } from "react";

import { Badge, avisar, Button, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type CicloTurno, type EsquemaCobertura, resumenEsquema } from "./esquemas-tipos";
import { HojaEsquemaDiferida } from "./hoja-esquema-diferida";

type Abierta = { esquema?: EsquemaCobertura } | null;

/** Esquemas de cobertura de la empresa: lista, crear, editar y archivar (nunca borrar; `cpq:modelo.manage`). */
export function EsquemasEditable({
  esquemas,
  ciclos,
  editable,
}: {
  esquemas: readonly EsquemaCobertura[];
  ciclos: readonly CicloTurno[];
  editable: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [abierta, setAbierta] = useState<Abierta>(null);
  const [verArchivados, setVerArchivados] = useState(false);

  async function alternar(e: EsquemaCobertura) {
    const r = await ejecutar("cpq.esquemas_cobertura.guardar", {
      id: e.id,
      nombre: e.nombre,
      descripcion: e.descripcion,
      activo: !e.activo,
      tramos: e.tramos.map(({ id: _i, patronNombre: _p, ...t }) => t),
    });
    if (r != null) avisar.exito(e.activo ? "Esquema archivado" : "Esquema restaurado");
  }

  const visibles = esquemas.filter((e) => verArchivados || e.activo);
  return (
    <section aria-labelledby="esquemas-titulo" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="esquemas-titulo" className="t-subheading">Esquemas de cobertura</h3>
          <p className="t-caption text-fg-muted">Un esquema es el patrón completo que se cotiza como una unidad, p. ej. «24/7».</p>
        </div>
        <div className="flex items-center gap-3">
          <Switch etiqueta="Ver archivados" activo={verArchivados} onCambiar={setVerArchivados} />
          {editable ? (
            <Button type="button" disabled={ciclos.length === 0} onClick={() => setAbierta({})}>
              Agregar esquema
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p role="alert" className="t-caption text-danger-fg">{error}</p> : null}
      {ciclos.length === 0 ? (
        <p className="t-body-sm text-fg-muted">No hay ciclos de turno vigentes: crea uno en Operaciones para armar esquemas.</p>
      ) : null}
      {visibles.length === 0 && ciclos.length > 0 ? (
        <p className="t-body-sm text-fg-muted">
          Aún no hay esquemas.{editable ? " Crea tu primer esquema." : " Pídele a un administrador que cree esquemas."}
        </p>
      ) : null}
      <ul className="divide-y divide-border rounded-lg border border-border">
        {visibles.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className="min-w-0">
              <span className="t-label">{e.nombre}</span>
              <span className="t-caption block text-fg-muted">{resumenEsquema(e)}</span>
            </span>
            <span className="flex items-center gap-1">
              <Badge tono={e.activo ? "success" : "neutro"}>{e.activo ? "Activo" : "Archivado"}</Badge>
              {editable ? (
                <>
                  <Button type="button" variant="ghost" onClick={() => setAbierta({ esquema: e })}>Editar</Button>
                  <Button type="button" variant="ghost" disabled={pendiente} onClick={() => void alternar(e)}>
                    {e.activo ? "Archivar" : "Restaurar"}
                  </Button>
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="t-caption text-fg-muted">Los esquemas se archivan, nunca se borran: las cotizaciones antiguas conservan su cobertura.</p>
      {abierta ? (
        <HojaEsquemaDiferida {...(abierta.esquema ? { esquema: abierta.esquema } : {})} esquemas={esquemas} ciclos={ciclos} onCerrar={() => setAbierta(null)} />
      ) : null}
    </section>
  );
}
