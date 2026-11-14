"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { CATEGORIAS, type TipoInventario } from "./datos";
import { type CampoEditable, EditorCampos } from "./editor-campos";

const aTallas = (texto: string) =>
  texto
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

/** Nuevo tipo de inventario o editar uno (la categoría solo se elige al crear, R2). */
export function HojaTipo({ tipo }: { tipo?: TipoInventario }) {
  const hoja = useHojaUrl(tipo ? "editar" : "nuevo");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [categoria, setCategoria] = useState<string>(tipo?.categoria ?? "activo");
  const [nombre, setNombre] = useState(tipo?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(tipo?.descripcion ?? "");
  const [tallas, setTallas] = useState((tipo?.tallas ?? []).join(", "));
  const [campos, setCampos] = useState<CampoEditable[]>(
    (tipo?.campos ?? []).map((c) => ({ ...c, llave: c.clave })),
  );
  const esRopa = categoria === "ropa";
  const camposListos = campos.every((c) => c.etiqueta.trim().length >= 2);
  const listo = nombre.trim().length >= 2 && (esRopa ? aTallas(tallas).length > 0 : camposListos);

  async function guardar() {
    const datos = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || (tipo ? null : undefined),
      ...(esRopa
        ? { tallas: aTallas(tallas) }
        : {
            campos: campos.map((c) => ({
              ...(c.clave ? { clave: c.clave } : {}),
              etiqueta: c.etiqueta.trim(),
              tipo: c.tipo,
              obligatorio: c.obligatorio,
            })),
          }),
    };
    const r = await ejecutar<{ id: string }>(
      tipo ? "inventario.tipos.actualizar" : "inventario.tipos.crear",
      tipo ? { id: tipo.id, ...datos } : { categoria, ...datos },
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
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || !listo} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : tipo ? "Guardar" : "Crear tipo"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {tipo ? null : (
          <Campo
            etiqueta="Categoría"
            htmlFor="it-categoria"
            ayuda="Un activo se controla uno por uno; la ropa, por cantidad y talla. No se cambia después."
          >
            <Select id="it-categoria" valor={categoria} onCambiar={setCategoria} opciones={CATEGORIAS} />
          </Campo>
        )}
        <Campo etiqueta="Nombre" htmlFor="it-nombre">
          <Input id="it-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </Campo>
        <Campo etiqueta="Descripción" htmlFor="it-desc">
          <Textarea id="it-desc" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>
        {esRopa ? (
          <Campo etiqueta="Tallas" htmlFor="it-tallas" ayuda="Separadas por coma, por ejemplo: S, M, L, XL.">
            <Input id="it-tallas" value={tallas} onChange={(e) => setTallas(e.target.value)} />
          </Campo>
        ) : (
          <EditorCampos campos={campos} onCambiar={setCampos} />
        )}
      </div>
    </Sheet>
  );
}
