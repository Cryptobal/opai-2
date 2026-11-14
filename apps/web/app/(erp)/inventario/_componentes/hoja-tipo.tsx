"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { AccionesHoja } from "./acciones-hoja";
import { type CampoEditable, EditorCampos } from "./editor-campos";
import { CATEGORIAS, type TipoInventario } from "./tipos";

const aTallas = (texto: string) =>
  texto
    .split(",")
    .map((t) => t.replace(/\s+/g, "").toUpperCase())
    .filter(Boolean);
const tallasValidas = (t: string[]) => t.length > 0 && t.length <= 20 && t.every((x) => x.length <= 10);

type Estado = { categoria: string; nombre: string; descripcion: string; tallas: string; campos: CampoEditable[] };

const inicial = (t?: TipoInventario): Estado => ({
  categoria: t?.categoria ?? "activo",
  nombre: t?.nombre ?? "",
  descripcion: t?.descripcion ?? "",
  tallas: (t?.tallas ?? []).join(", "),
  campos: (t?.campos ?? []).map((c) => ({ ...c, llave: c.clave })),
});

/** Lo que se envía a crear o actualizar: tallas en la ropa, campos propios en el activo. */
function datosDe(e: Estado, editando: boolean) {
  return {
    nombre: e.nombre.trim(),
    descripcion: e.descripcion.trim() || (editando ? null : undefined),
    ...(e.categoria === "ropa"
      ? { tallas: aTallas(e.tallas) }
      : {
          campos: e.campos.map((c) => ({
            ...(c.clave ? { clave: c.clave } : {}),
            etiqueta: c.etiqueta.trim(),
            tipo: c.tipo,
            obligatorio: c.obligatorio,
          })),
        }),
  };
}

/** Nuevo tipo de inventario o editar uno (la categoría solo se elige al crear, R2). */
export function HojaTipo({ tipo }: { tipo?: TipoInventario }) {
  const hoja = useHojaUrl(tipo ? "editar" : "nuevo");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [e, setE] = useState<Estado>(() => inicial(tipo));
  const fijar = (parcial: Partial<Estado>) => setE((x) => ({ ...x, ...parcial }));
  const esRopa = e.categoria === "ropa";
  const camposListos = e.campos.every((c) => c.etiqueta.trim().length >= 2);
  const listo = e.nombre.trim().length >= 2 && (esRopa ? tallasValidas(aTallas(e.tallas)) : camposListos);

  async function guardar() {
    const datos = datosDe(e, Boolean(tipo));
    const r = await ejecutar<{ id: string }>(
      tipo ? "inventario.tipos.actualizar" : "inventario.tipos.crear",
      tipo ? { id: tipo.id, ...datos } : { categoria: e.categoria, ...datos },
    );
    if (!r) return;
    avisar.exito(tipo ? "Tipo actualizado" : "Tipo creado");
    hoja.cerrar();
    if (!tipo) router.push(`/inventario/tipos/${r.id}`);
  }

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={tipo ? "Editar tipo" : "Nuevo tipo"}
      acciones={
        <AccionesHoja
          onCancelar={hoja.cerrar}
          onGuardar={() => void guardar()}
          listo={listo}
          pendiente={pendiente}
          texto={tipo ? "Guardar" : "Crear tipo"}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposTipo e={e} fijar={fijar} creando={!tipo} />
      </div>
    </Sheet>
  );
}

function CamposTipo({ e, fijar, creando }: { e: Estado; fijar: (p: Partial<Estado>) => void; creando: boolean }) {
  return (
    <>
      {creando ? (
        <Campo
          etiqueta="Categoría"
          htmlFor="it-categoria"
          ayuda="Un activo se controla uno por uno; la ropa, por cantidad y talla. No se cambia después."
        >
          <Select id="it-categoria" valor={e.categoria} onCambiar={(v) => fijar({ categoria: v })} opciones={CATEGORIAS} />
        </Campo>
      ) : null}
      <Campo etiqueta="Nombre" htmlFor="it-nombre">
        <Input id="it-nombre" value={e.nombre} onChange={(x) => fijar({ nombre: x.target.value })} autoFocus />
      </Campo>
      <Campo etiqueta="Descripción" htmlFor="it-desc">
        <Textarea id="it-desc" rows={2} value={e.descripcion} onChange={(x) => fijar({ descripcion: x.target.value })} />
      </Campo>
      {e.categoria === "ropa" ? (
        <Campo etiqueta="Tallas" htmlFor="it-tallas" ayuda="Separadas por coma, por ejemplo: S, M, L, XL. Hasta 20 tallas de 10 caracteres.">
          <Input id="it-tallas" value={e.tallas} onChange={(x) => fijar({ tallas: x.target.value })} />
        </Campo>
      ) : (
        <EditorCampos campos={e.campos} onCambiar={(campos) => fijar({ campos })} />
      )}
    </>
  );
}
