"use client";

import { useState } from "react";

import { Alerta, avisar, Campo, Input, SeccionTarjeta, Badge } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Marca } from "./tipos";
import { CampoColorMarca, errorColorMarca } from "./campo-color-marca";
import { FormularioDocumentoMarca } from "./formulario-documento";
import { VistaPreviaMarca } from "./vista-previa-marca";

type Props = { marca: Marca; puede: boolean; hoy: string };

export function FormularioMarca({ marca, puede, hoy }: Props) {
  const [d, setD] = useState({
    nombreComercial: marca.nombreComercial ?? "",
    eslogan: marca.eslogan ?? "",
    colorPrimario: marca.colorPrimario ?? "",
    colorSecundario: marca.colorSecundario ?? "",
  });
  const [doc, setDoc] = useState<Record<string, unknown>>({});
  const { ejecutar, error: falla } = useCapacidad("erp");
  const set = (k: keyof typeof d) => (v: string) => setD((x) => ({ ...x, [k]: v }));
  async function guardar() {
    if (errorColorMarca(d.colorPrimario) || errorColorMarca(d.colorSecundario)) return;
    const r = await ejecutar("core.marca.update", {
      nombreComercial: d.nombreComercial.trim() || null,
      eslogan: d.eslogan.trim() || null,
      colorPrimario: d.colorPrimario || null,
      colorSecundario: d.colorSecundario || null,
      ...doc,
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
            <CampoColorMarca
              id="m-primario"
              etiqueta="Primario"
              valor={d.colorPrimario}
              onCambiar={set("colorPrimario")}
              disabled={!puede}
            />
            <CampoColorMarca
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
      <SeccionTarjeta titulo="Documentos PDF">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="t-caption text-fg-muted">
            Cotizaciones y propuestas técnicas. Los logos de arriba también aplican aquí.
          </p>
          {marca.documentoVersion > 0 ? (
            <Badge tono="info">Versión v{marca.documentoVersion}</Badge>
          ) : null}
        </div>
        <FormularioDocumentoMarca
          tipografia={marca.documentoTipografia}
          piePagina={marca.documentoPiePagina}
          condicionesDefault={marca.documentoCondicionesDefault}
          puede={puede}
          onCambio={(v) => setDoc((x) => ({ ...x, ...v }))}
        />
      </SeccionTarjeta>
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
