"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { AccionesHoja } from "./acciones-hoja";
import { CamposActivo } from "./campos-activo";
import type { CampoTipo, FichaActivo, TipoInventario } from "./tipos";

type Estado = { tipoId: string; codigo: string; serie: string; notas: string; valores: Record<string, string> };

const inicial = (a: FichaActivo | undefined, tipos: TipoInventario[]): Estado => ({
  tipoId: a?.tipoId ?? tipos[0]?.id ?? "",
  codigo: a?.codigo ?? "",
  serie: a?.numeroSerie ?? "",
  notas: a?.notas ?? "",
  valores: Object.fromEntries(Object.entries(a?.valores ?? {}).map(([k, x]) => [k, String(x)])),
});

function datosDe(e: Estado, campos: CampoTipo[], editando: boolean) {
  const vacio = editando ? null : undefined;
  return {
    codigo: e.codigo.trim(),
    numeroSerie: e.serie.trim() || vacio,
    notas: e.notas.trim() || vacio,
    valores: Object.fromEntries(campos.map((c) => [c.clave, e.valores[c.clave]?.trim() || null])),
  };
}

/** Registrar un activo (eligiendo su tipo) o corregir sus datos; el tipo no cambia después (R13). */
export function HojaActivo({ activo, tipos = [] }: { activo?: FichaActivo; tipos?: TipoInventario[] }) {
  const hoja = useHojaUrl(activo ? "editar" : "nuevo");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [e, setE] = useState<Estado>(() => inicial(activo, tipos));
  const fijar = (parcial: Partial<Estado>) => setE((x) => ({ ...x, ...parcial }));
  const campos = activo?.campos ?? tipos.find((t) => t.id === e.tipoId)?.campos ?? [];
  const faltan = campos.some((c) => c.obligatorio && !e.valores[c.clave]?.trim());
  const listo = e.codigo.trim().length > 0 && e.tipoId !== "" && !faltan;

  async function guardar() {
    const datos = datosDe(e, campos, Boolean(activo));
    const r = await ejecutar<{ id: string }>(
      activo ? "inventario.activos.actualizar" : "inventario.activos.crear",
      activo ? { id: activo.id, ...datos } : { tipoId: e.tipoId, ...datos },
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
        <AccionesHoja
          onCancelar={hoja.cerrar}
          onGuardar={() => void guardar()}
          listo={listo}
          pendiente={pendiente}
          texto={activo ? "Guardar" : "Registrar activo"}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {activo ? null : (
          <Campo etiqueta="Tipo" htmlFor="ia-tipo">
            <Select
              id="ia-tipo"
              valor={e.tipoId}
              onCambiar={(v) => fijar({ tipoId: v, valores: {} })}
              opciones={tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre }))}
            />
          </Campo>
        )}
        <CamposBase e={e} fijar={fijar} campos={campos} />
      </div>
    </Sheet>
  );
}

function CamposBase({ e, fijar, campos }: { e: Estado; fijar: (p: Partial<Estado>) => void; campos: CampoTipo[] }) {
  return (
    <>
      <Campo etiqueta="Código" htmlFor="ia-codigo" ayuda="Único en la empresa, por ejemplo el de la etiqueta.">
        <Input id="ia-codigo" value={e.codigo} onChange={(x) => fijar({ codigo: x.target.value })} autoFocus />
      </Campo>
      <Campo etiqueta="Número de serie" htmlFor="ia-serie">
        <Input id="ia-serie" value={e.serie} onChange={(x) => fijar({ serie: x.target.value })} />
      </Campo>
      <CamposActivo
        campos={campos}
        valores={e.valores}
        onCambiar={(k, v) => fijar({ valores: { ...e.valores, [k]: v } })}
      />
      <Campo etiqueta="Notas" htmlFor="ia-notas">
        <Textarea id="ia-notas" rows={2} value={e.notas} onChange={(x) => fijar({ notas: x.target.value })} />
      </Campo>
    </>
  );
}
