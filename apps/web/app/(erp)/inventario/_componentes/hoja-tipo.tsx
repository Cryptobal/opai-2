"use client";

import { useState } from "react";

import { Alerta, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { AccionesHoja } from "./acciones-hoja";
import { type CampoEditable, EditorCampos } from "./editor-campos";
import { CATEGORIAS, type PrendaKit, type TipoInventario } from "./tipos";

type OpcionCategoria = { valor: string; etiqueta: string; comportamiento: "activo" | "ropa" };
import { useHojaEntidad } from "./use-hoja-entidad";

const aTallas = (texto: string) =>
  texto
    .split(",")
    .map((t) => t.replace(/\s+/g, "").toUpperCase())
    .filter(Boolean);
const tallasValidas = (t: string[]) => t.length > 0 && t.length <= 20 && t.every((x) => x.length <= 10);

type Estado = { categoria: string; nombre: string; descripcion: string; tallas: string; prenda: string; campos: CampoEditable[] };
const SIN_PRENDA = "ninguna";

const inicial = (t?: TipoInventario): Estado => ({
  categoria: t?.categoria ?? "activo",
  nombre: t?.nombre ?? "",
  descripcion: t?.descripcion ?? "",
  tallas: (t?.tallas ?? []).join(", "),
  prenda: t?.prendaClave ?? SIN_PRENDA,
  campos: (t?.campos ?? []).map((c) => ({ ...c, llave: c.clave })),
});

/** Lo que se envía a crear o actualizar: tallas en la ropa, campos propios en el activo. */
function comportamientoDe(categoria: string, opciones: OpcionCategoria[]) {
  return opciones.find((c) => c.valor === categoria)?.comportamiento ?? (categoria === "ropa" ? "ropa" : "activo");
}

function datosDe(e: Estado, editando: boolean, opciones: OpcionCategoria[]) {
  const comp = comportamientoDe(e.categoria, opciones);
  return {
    nombre: e.nombre.trim(),
    descripcion: e.descripcion.trim() || (editando ? null : undefined),
    ...(comp === "ropa"
      ? { tallas: aTallas(e.tallas), prendaClave: e.prenda === SIN_PRENDA ? (editando ? null : undefined) : e.prenda }
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
export function HojaTipo({
  tipo,
  kit,
  categorias = CATEGORIAS.map((c) => ({ ...c, comportamiento: c.valor as "activo" | "ropa" })),
}: {
  tipo?: TipoInventario;
  kit: PrendaKit[];
  categorias?: OpcionCategoria[];
}) {
  const { hoja, ejecutar, pendiente, error, terminar } = useHojaEntidad(Boolean(tipo), "/inventario/tipos");
  const [e, setE] = useState<Estado>(() => inicial(tipo));
  const fijar = (parcial: Partial<Estado>) => setE((x) => ({ ...x, ...parcial }));
  const comp = comportamientoDe(e.categoria, categorias);
  const esRopa = comp === "ropa";
  const camposListos = e.campos.every((c) => c.etiqueta.trim().length >= 2);
  const listo = e.nombre.trim().length >= 2 && (esRopa ? tallasValidas(aTallas(e.tallas)) : camposListos);

  async function guardar() {
    const datos = datosDe(e, Boolean(tipo), categorias);
    const r = await ejecutar<{ id: string }>(
      tipo ? "inventario.tipos.actualizar" : "inventario.tipos.crear",
      tipo ? { id: tipo.id, ...datos } : { categoria: e.categoria, ...datos },
    );
    terminar(r, tipo ? "Tipo actualizado" : "Tipo creado");
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
        <CamposTipo e={e} fijar={fijar} creando={!tipo} kit={kit} categorias={categorias} comp={comp} />
      </div>
    </Sheet>
  );
}

/** «Ninguna», el kit y, si el tipo apunta a una prenda que ya salió del kit, esa también. */
function opcionesPrenda(kit: PrendaKit[], actual: string) {
  const fuera = actual !== SIN_PRENDA && !kit.some((p) => p.clave === actual) ? [{ valor: actual, etiqueta: actual }] : [];
  return [{ valor: SIN_PRENDA, etiqueta: "Ninguna" }, ...kit.map((p) => ({ valor: p.clave, etiqueta: p.nombre })), ...fuera];
}

type PropsCampos = {
  e: Estado;
  fijar: (p: Partial<Estado>) => void;
  creando: boolean;
  kit: PrendaKit[];
  categorias: OpcionCategoria[];
  comp: "activo" | "ropa";
};

function CamposTipo({ e, fijar, creando, kit, categorias, comp }: PropsCampos) {
  return (
    <>
      {creando ? (
        <Campo
          etiqueta="Categoría"
          htmlFor="it-categoria"
          ayuda="Un activo se controla uno por uno; la ropa, por cantidad y talla. No se cambia después."
        >
          <Select
            id="it-categoria"
            valor={e.categoria}
            onCambiar={(v) => fijar({ categoria: v })}
            opciones={categorias.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))}
          />
        </Campo>
      ) : null}
      <Campo etiqueta="Nombre" htmlFor="it-nombre">
        <Input id="it-nombre" value={e.nombre} onChange={(x) => fijar({ nombre: x.target.value })} autoFocus />
      </Campo>
      <Campo etiqueta="Descripción" htmlFor="it-desc">
        <Textarea id="it-desc" rows={2} value={e.descripcion} onChange={(x) => fijar({ descripcion: x.target.value })} />
      </Campo>
      {comp === "ropa" ? (
        <>
          <Campo etiqueta="Tallas" htmlFor="it-tallas" ayuda="Separadas por coma, por ejemplo: S, M, L, XL. Hasta 20 tallas de 10 caracteres.">
            <Input id="it-tallas" value={e.tallas} onChange={(x) => fijar({ tallas: x.target.value })} />
          </Campo>
          <Campo etiqueta="Prenda del uniforme" htmlFor="it-prenda" ayuda="Al entregar a una persona se propone la talla que tiene en su ficha para esta prenda.">
            <Select
              id="it-prenda"
              valor={e.prenda}
              onCambiar={(v) => fijar({ prenda: v })}
              opciones={opcionesPrenda(kit, e.prenda)}
            />
          </Campo>
        </>
      ) : (
        <EditorCampos campos={e.campos} onCambiar={(campos) => fijar({ campos })} />
      )}
    </>
  );
}
