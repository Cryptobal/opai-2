"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { CamposActivo } from "./campos-activo";
import type { FichaActivo, TipoInventario } from "./tipos";

const comoTexto = (v: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));

/** Registrar un activo (eligiendo su tipo) o corregir sus datos; el tipo no cambia después. */
export function HojaActivo({ activo, tipos = [] }: { activo?: FichaActivo; tipos?: TipoInventario[] }) {
  const hoja = useHojaUrl(activo ? "editar" : "nuevo");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [tipoId, setTipoId] = useState(activo?.tipoId ?? tipos[0]?.id ?? "");
  const [codigo, setCodigo] = useState(activo?.codigo ?? "");
  const [serie, setSerie] = useState(activo?.numeroSerie ?? "");
  const [notas, setNotas] = useState(activo?.notas ?? "");
  const [valores, setValores] = useState<Record<string, string>>(comoTexto(activo?.valores ?? {}));
  const campos = activo?.campos ?? tipos.find((t) => t.id === tipoId)?.campos ?? [];
  const faltan = campos.some((c) => c.obligatorio && !valores[c.clave]?.trim());
  const listo = codigo.trim().length > 0 && tipoId !== "" && !faltan;

  async function guardar() {
    const datos = {
      codigo: codigo.trim(),
      numeroSerie: serie.trim() || (activo ? null : undefined),
      notas: notas.trim() || (activo ? null : undefined),
      valores: Object.fromEntries(campos.map((c) => [c.clave, valores[c.clave]?.trim() || null])),
    };
    const r = await ejecutar<{ id: string }>(
      activo ? "inventario.activos.actualizar" : "inventario.activos.crear",
      activo ? { id: activo.id, ...datos } : { tipoId, ...datos },
    );
    if (!r) return;
    avisar.exito(activo ? "Activo actualizado" : "Activo registrado");
    hoja.cerrar();
    if (!activo) router.push(`/inventario/activos/${r.id}`);
  }

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={activo ? "Editar activo" : "Nuevo activo"}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || !listo} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : activo ? "Guardar" : "Registrar activo"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {activo ? null : (
          <Campo etiqueta="Tipo" htmlFor="ia-tipo">
            <Select
              id="ia-tipo"
              valor={tipoId}
              onCambiar={(v) => {
                setTipoId(v);
                setValores({});
              }}
              opciones={tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre }))}
            />
          </Campo>
        )}
        <Campo etiqueta="Código" htmlFor="ia-codigo" ayuda="Único en la empresa, por ejemplo el de la etiqueta.">
          <Input id="ia-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus />
        </Campo>
        <Campo etiqueta="Número de serie" htmlFor="ia-serie">
          <Input id="ia-serie" value={serie} onChange={(e) => setSerie(e.target.value)} />
        </Campo>
        <CamposActivo campos={campos} valores={valores} onCambiar={(k, v) => setValores((x) => ({ ...x, [k]: v }))} />
        <Campo etiqueta="Notas" htmlFor="ia-notas">
          <Textarea id="ia-notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}
