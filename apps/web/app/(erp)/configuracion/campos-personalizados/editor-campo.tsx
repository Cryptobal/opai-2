"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Switch, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { ENTIDADES, TIPOS, type CampoConfig, type EntidadCampo, type TipoCampo } from "./lista-campos";

type Props = ({ campo: CampoConfig } | { entidad: EntidadCampo }) & { onCerrar: () => void };

/** Crea o edita un campo. El tipo se elige al crear; después no cambia (los valores dependen de él). */
export function EditorCampo(p: Props) {
  const campo = "campo" in p ? p.campo : null;
  const entidad = campo?.entidad ?? ("entidad" in p ? p.entidad : "cuenta");
  const [etiqueta, setEtiqueta] = useState(campo?.etiqueta ?? "");
  const [tipo, setTipo] = useState<TipoCampo>(campo?.tipo ?? "texto");
  const [opciones, setOpciones] = useState((campo?.opciones ?? []).join("\n"));
  const [obligatorio, setObligatorio] = useState(campo?.obligatorio ?? false);
  const [activo, setActivo] = useState(campo?.activo ?? true);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const lista = opciones
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
  const nombreEntidad = ENTIDADES.find((e) => e.valor === entidad)?.etiqueta.toLowerCase();

  async function guardar() {
    const comun = { etiqueta: etiqueta.trim(), obligatorio, ...(tipo === "lista" ? { opciones: lista } : {}) };
    const r = campo
      ? await ejecutar("core.campos_personalizados.update", { id: campo.id, ...comun, activo })
      : await ejecutar("core.campos_personalizados.create", { entidad, tipo, ...comun });
    if (!r) return;
    avisar.exito(campo ? "Campo guardado" : "Campo creado");
    p.onCerrar();
  }

  const invalido = !etiqueta.trim() || (tipo === "lista" && lista.length === 0);
  return (
    <Sheet
      abierto
      onCerrar={p.onCerrar}
      titulo={campo ? "Editar campo" : "Nuevo campo"}
      descripcion={`Aparece en la ficha de ${nombreEntidad}.`}
      acciones={
        <>
          <Button variant="secondary" onClick={p.onCerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || invalido} onClick={() => void guardar()}>
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
            onCambiar={(v) => setTipo(v as TipoCampo)}
            opciones={TIPOS}
            disabled={Boolean(campo)}
          />
        </Campo>
        {tipo === "lista" ? (
          <Campo etiqueta="Opciones" htmlFor="campo-opciones" ayuda="Una por línea, hasta 50.">
            <Textarea
              id="campo-opciones"
              rows={5}
              value={opciones}
              onChange={(e) => setOpciones(e.target.value)}
            />
          </Campo>
        ) : null}
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
