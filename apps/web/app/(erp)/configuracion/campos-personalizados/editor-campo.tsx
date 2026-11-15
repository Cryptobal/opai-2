"use client";

import { useState } from "react";

import type { EntidadCampoPersonalizado, TipoCampoPersonalizado } from "@opai/domain";
import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { DefinicionCampo, definicionInicial, entradaDefinicion } from "./definicion-campo";
import { TIPOS, type CampoConfig } from "./tipos-campo";

type Props = (
  { campo: CampoConfig } | { entidad: EntidadCampoPersonalizado; nombreFicha: string }
) & {
  onCerrar: () => void;
};

/** Crea o edita un campo. El tipo se elige al crear; después no cambia (los valores dependen de él). */
export function EditorCampo(p: Props) {
  const campo = "campo" in p ? p.campo : null;
  const [etiqueta, setEtiqueta] = useState(campo?.etiqueta ?? "");
  const [tipo, setTipo] = useState<TipoCampoPersonalizado>(campo?.tipo ?? "texto");
  const [descripcion, setDescripcion] = useState(campo?.descripcion ?? "");
  const [def, setDef] = useState(() => definicionInicial(campo));
  const [obligatorio, setObligatorio] = useState(campo?.obligatorio ?? false);
  const [activo, setActivo] = useState(campo?.activo ?? true);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const definicion = entradaDefinicion(tipo, def);

  async function guardar() {
    const comun = {
      etiqueta: etiqueta.trim(),
      descripcion: descripcion.trim() || null,
      obligatorio,
      ...definicion,
    };
    const r =
      "entidad" in p
        ? await ejecutar("core.campos_personalizados.create", {
            entidad: p.entidad,
            tipo,
            ...comun,
          })
        : await ejecutar("core.campos_personalizados.update", { id: p.campo.id, ...comun, activo });
    if (!r) return;
    avisar.exito(campo ? "Campo guardado" : "Campo creado");
    p.onCerrar();
  }

  return (
    <Sheet
      abierto
      onCerrar={p.onCerrar}
      titulo={campo ? "Editar campo" : "Nuevo campo"}
      {...("nombreFicha" in p
        ? { descripcion: `Aparece en la ficha de ${p.nombreFicha.toLowerCase()}.` }
        : {})}
      acciones={
        <>
          <Button variant="secondary" onClick={p.onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || !etiqueta.trim() || !definicion}
            onClick={() => void guardar()}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Nombre" htmlFor="campo-etiqueta">
          <Input
            id="campo-etiqueta"
            maxLength={60}
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
          />
        </Campo>
        <Campo
          etiqueta="Tipo"
          htmlFor="campo-tipo"
          {...(campo ? { ayuda: "El tipo no se cambia después de crear el campo." } : {})}
        >
          <Select
            id="campo-tipo"
            valor={tipo}
            onCambiar={(v) => {
              setTipo(v as TipoCampoPersonalizado);
              setDef({ ...def, defecto: null });
            }}
            opciones={TIPOS}
            disabled={Boolean(campo)}
          />
        </Campo>
        <Campo
          etiqueta="Ayuda"
          htmlFor="campo-ayuda"
          ayuda="Texto corto que se muestra bajo el campo en la ficha."
        >
          <Input
            id="campo-ayuda"
            maxLength={300}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Campo>
        <DefinicionCampo tipo={tipo} d={def} onCambiar={setDef} />
        <Switch
          activo={obligatorio}
          onCambiar={setObligatorio}
          etiqueta="Obligatorio"
          descripcion="No se puede dejar vacío al guardar la ficha."
        />
        {campo ? (
          <Switch
            activo={activo}
            onCambiar={setActivo}
            etiqueta="Campo activo"
            descripcion="Si lo archivas deja de mostrarse, pero lo guardado no se borra."
          />
        ) : null}
      </div>
    </Sheet>
  );
}
