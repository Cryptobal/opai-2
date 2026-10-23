"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Checkbox, Input, Sheet, Switch } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { PORTALES, type TipoDoc } from "./tipos";

type Props = { capa: string; tipo?: TipoDoc };

/** Nuevo tipo de documento en la capa elegida o editar uno existente (`?nuevo=1` / `?editar=<id>`). */
export function HojaTipo({ capa, tipo }: Props) {
  const hoja = useHojaUrl(tipo ? "editar" : "nuevo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState(tipo?.nombre ?? "");
  const [obligatorio, setObligatorio] = useState(tipo?.obligatorio ?? false);
  const [vence, setVence] = useState(tipo?.tieneVencimiento ?? false);
  const [dias, setDias] = useState(String(tipo?.diasAlerta ?? 30));
  const [normativa, setNormativa] = useState(tipo?.normativa ?? "");
  const [portales, setPortales] = useState<string[]>(tipo?.visiblePortalDefault ?? []);
  const [activo, setActivo] = useState(tipo?.activo ?? true);
  const codigoMalo = !tipo && !/^[a-z0-9_.-]{2,40}$/.test(codigo.trim().toLowerCase());
  const diasMalo = vence && !(Number(dias) >= 0 && Number(dias) <= 365);
  async function guardar() {
    const campos = {
      nombre: nombre.trim(),
      obligatorio,
      tieneVencimiento: vence,
      ...(vence ? { diasAlerta: Number(dias) } : {}),
      normativa: normativa.trim() || null,
      visiblePortalDefault: portales,
    };
    const r = await ejecutar(
      tipo ? "core.documento_tipos.update" : "core.documento_tipos.create",
      tipo
        ? { id: tipo.id, ...campos, activo }
        : { codigo: codigo.trim().toLowerCase(), capa, ...campos },
    );
    if (!r) return;
    avisar.exito(tipo ? "Tipo actualizado" : "Tipo creado");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={tipo ? hoja.valor === tipo.id : hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={tipo ? `Editar ${tipo.nombre}` : "Nuevo tipo de documento"}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || codigoMalo || diasMalo || nombre.trim().length < 2}
            onClick={() => void guardar()}
          >
            {pendiente ? "Guardando…" : tipo ? "Guardar" : "Crear tipo"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {tipo ? null : (
          <Campo
            etiqueta="Código"
            htmlFor="t-codigo"
            ayuda="Único; minúsculas, números, punto o guion (licencia_conducir)"
          >
            <Input
              id="t-codigo"
              className="t-mono"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </Campo>
        )}
        <Campo etiqueta="Nombre" htmlFor="t-nombre">
          <Input id="t-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Switch
          etiqueta="Obligatorio"
          descripcion="Si falta, aparece como faltante en el semáforo"
          activo={obligatorio}
          onCambiar={setObligatorio}
        />
        <Switch
          etiqueta="Vence"
          descripcion="Pide fecha de vencimiento al subirlo"
          activo={vence}
          onCambiar={setVence}
        />
        {vence ? (
          <Campo
            etiqueta="Avisar con anticipación (días)"
            htmlFor="t-dias"
            {...(diasMalo ? { error: "Entre 0 y 365 días" } : {})}
          >
            <Input
              id="t-dias"
              inputMode="numeric"
              value={dias}
              onChange={(e) => setDias(e.target.value.replace(/\D/g, ""))}
            />
          </Campo>
        ) : null}
        <Campo etiqueta="Normativa" htmlFor="t-norma" ayuda="Opcional (Ley 21.659, D.S. 93…)">
          <Input id="t-norma" value={normativa} onChange={(e) => setNormativa(e.target.value)} />
        </Campo>
        <fieldset className="flex flex-col gap-2">
          <legend className="t-label mb-1 text-fg">Visible por defecto en</legend>
          {PORTALES.map((p) => (
            <Checkbox
              key={p.valor}
              etiqueta={`Portal ${p.etiqueta}`}
              marcado={portales.includes(p.valor)}
              onCambiar={(m) =>
                setPortales((x) => (m ? [...x, p.valor] : x.filter((y) => y !== p.valor)))
              }
            />
          ))}
        </fieldset>
        {tipo ? (
          <Switch
            etiqueta="Activo"
            descripcion="Un tipo inactivo no se ofrece al subir"
            activo={activo}
            onCambiar={setActivo}
          />
        ) : null}
      </div>
    </Sheet>
  );
}
