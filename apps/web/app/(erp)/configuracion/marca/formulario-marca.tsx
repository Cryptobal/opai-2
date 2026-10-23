"use client";

import { useState } from "react";

import { Alerta, avisar, Campo, Input, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Marca } from "./tipos";
import { VistaPreviaMarca } from "./vista-previa-marca";

const HEX = /^#[0-9a-fA-F]{6}$/;
const error = (c: string) => (c && !HEX.test(c) ? 'Usa el formato "#RRGGBB"' : undefined);

function CampoColor({
  id,
  etiqueta,
  valor,
  onCambiar,
  disabled,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onCambiar: (v: string) => void;
  disabled: boolean;
}) {
  const e = error(valor);
  return (
    <Campo etiqueta={etiqueta} htmlFor={id} {...(e ? { error: e } : {})}>
      <div className="flex gap-2">
        <Input
          type="color"
          aria-label={`${etiqueta}: selector`}
          className="w-14 flex-none p-1"
          value={HEX.test(valor) ? valor : "#000000"}
          disabled={disabled}
          onChange={(x) => onCambiar(x.target.value)}
        />
        <Input
          id={id}
          className="t-mono"
          placeholder="Código hex, por ejemplo #0B3D91"
          value={valor}
          disabled={disabled}
          aria-invalid={e ? true : undefined}
          onChange={(x) => onCambiar(x.target.value.trim())}
        />
      </div>
    </Campo>
  );
}

type Props = { marca: Marca; puede: boolean; hoy: string };

/** Colores, nombre y eslogan (22) con vista previa; "Guardar" está en la cabecera (form="form-marca"). */
export function FormularioMarca({ marca, puede, hoy }: Props) {
  const [d, setD] = useState({
    nombreComercial: marca.nombreComercial ?? "",
    eslogan: marca.eslogan ?? "",
    colorPrimario: marca.colorPrimario ?? "",
    colorSecundario: marca.colorSecundario ?? "",
  });
  const { ejecutar, error: falla } = useCapacidad("erp");
  const set = (k: keyof typeof d) => (v: string) => setD((x) => ({ ...x, [k]: v }));
  async function guardar() {
    if (error(d.colorPrimario) || error(d.colorSecundario)) return;
    const r = await ejecutar("core.marca.update", {
      nombreComercial: d.nombreComercial.trim() || null,
      eslogan: d.eslogan.trim() || null,
      colorPrimario: d.colorPrimario || null,
      colorSecundario: d.colorSecundario || null,
    });
    if (r) avisar.exito("Marca guardada");
  }
  return (
    <form
      id="form-marca"
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      {falla ? <Alerta tono="danger" titulo={falla} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <SeccionTarjeta titulo="Colores de marca">
          <div className="flex flex-col gap-4">
            <CampoColor
              id="m-primario"
              etiqueta="Primario"
              valor={d.colorPrimario}
              onCambiar={set("colorPrimario")}
              disabled={!puede}
            />
            <CampoColor
              id="m-secundario"
              etiqueta="Secundario"
              valor={d.colorSecundario}
              onCambiar={set("colorSecundario")}
              disabled={!puede}
            />
          </div>
        </SeccionTarjeta>
        <SeccionTarjeta titulo="Nombre y eslogan">
          <div className="flex flex-col gap-4">
            <Campo etiqueta="Nombre comercial" htmlFor="m-nombre">
              <Input
                id="m-nombre"
                value={d.nombreComercial}
                disabled={!puede}
                onChange={(e) => set("nombreComercial")(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Eslogan" htmlFor="m-eslogan">
              <Input
                id="m-eslogan"
                placeholder="Eslogan (opcional)"
                value={d.eslogan}
                disabled={!puede}
                onChange={(e) => set("eslogan")(e.target.value)}
              />
            </Campo>
          </div>
        </SeccionTarjeta>
      </div>
      <VistaPreviaMarca
        nombre={d.nombreComercial}
        primario={d.colorPrimario}
        secundario={d.colorSecundario}
        logo={marca.urls["logoPrincipalId"] ?? null}
        hoy={hoy}
      />
    </form>
  );
}
