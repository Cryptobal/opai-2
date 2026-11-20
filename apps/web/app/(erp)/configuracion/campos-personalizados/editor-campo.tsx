"use client";

import { useState } from "react";

import type { EntidadCampoPersonalizado, TipoCampoPersonalizado } from "@opai/domain";
import { avisar, Button, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { DatosCampo } from "./datos-campo";
import { DefinicionCampo, definicionInicial, entradaDefinicion, type Definicion } from "./definicion-campo";
import type { CampoConfig } from "./tipos-campo";

type Props = (
  | { campo: CampoConfig }
  | { entidad: EntidadCampoPersonalizado; nombreFicha: string }
) & {
  onCerrar: () => void;
};

async function guardarCampo(p: {
  props: Props;
  campo: CampoConfig | null;
  etiqueta: string;
  descripcion: string;
  tipo: TipoCampoPersonalizado;
  obligatorio: boolean;
  activo: boolean;
  definicion: Definicion;
  ejecutar: ReturnType<typeof useCapacidad>["ejecutar"];
}) {
  const entrada = entradaDefinicion(p.tipo, p.definicion);
  if (!entrada) return false;
  const comun = {
    etiqueta: p.etiqueta.trim(),
    descripcion: p.descripcion.trim() || null,
    obligatorio: p.obligatorio,
    ...entrada,
  };
  const r =
    "entidad" in p.props
      ? await p.ejecutar("core.campos_personalizados.create", {
          entidad: p.props.entidad,
          tipo: p.tipo,
          ...comun,
        })
      : await p.ejecutar("core.campos_personalizados.update", {
          id: p.props.campo.id,
          ...comun,
          activo: p.activo,
        });
  if (!r) return false;
  avisar.exito(p.campo ? "Campo guardado" : "Campo creado");
  p.props.onCerrar();
  return true;
}

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
            onClick={() =>
              void guardarCampo({
                props: p,
                campo,
                etiqueta,
                descripcion,
                tipo,
                obligatorio,
                activo,
                definicion: def,
                ejecutar,
              })
            }
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <DatosCampo
          error={error}
          etiqueta={etiqueta}
          onEtiqueta={setEtiqueta}
          tipo={tipo}
          onTipo={(t) => {
            setTipo(t);
            setDef({ ...def, defecto: null });
          }}
          creado={Boolean(campo)}
          descripcion={descripcion}
          onDescripcion={setDescripcion}
        />
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