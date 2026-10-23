"use client";

import { useState } from "react";

import {
  Campo,
  CampoDireccion,
  ChipToggle,
  Combobox,
  type Direccion,
  InputFecha,
  InputFechaRango,
} from "@opai/ds";

const LARGA = {
  calle: "Avenida Presidente Eduardo Frei Montalva 9950, Parque Industrial Lo Boza, Pudahuel",
  comuna: "Pudahuel",
  region: "Región Metropolitana de Santiago",
  placeId: "larga",
  lat: -33.4,
  lng: -70.77,
};

/** Casos de la QA pasada 1: dirección larga en panel angosto, fecha dd-mm-aaaa y chips activos. */
export function MuestraQaPasada1() {
  const [dir, setDir] = useState<Direccion | null>(LARGA);
  const [fecha, setFecha] = useState("2026-10-23");
  const [activos, setActivos] = useState({ vencidos: true, pronto: true, faltan: false });
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <fieldset data-testid="panel-angosto" className="w-[420px] max-w-full border-0 p-0">
        <Campo etiqueta="Dirección (panel de 420 px)" htmlFor="dir-larga">
          <CampoDireccion
            id="dir-larga"
            valor={dir}
            onCambiar={setDir}
            geocercaM={300}
            buscar={async () => []}
            resolver={async () => LARGA}
          />
        </Campo>
      </fieldset>
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Vigencia desde (dd-mm-aaaa)" htmlFor="fecha-es">
          <InputFecha id="fecha-es" valor={fecha} onCambiar={setFecha} />
        </Campo>
        <div className="flex flex-wrap gap-2" data-testid="chips-qa">
          {(
            [
              ["vencidos", "Vencidos"],
              ["pronto", "Vencen pronto"],
              ["faltan", "Faltan"],
            ] as const
          ).map(([k, e]) => (
            <ChipToggle
              key={k}
              etiqueta={e}
              contador={0}
              activo={activos[k]}
              onCambiar={(a) => setActivos((s) => ({ ...s, [k]: a }))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Misma estructura que Nueva instalación (grid de 3 secciones con combobox, dirección larga y vigencia). */
export function MuestraFormulario() {
  const [dir, setDir] = useState<Direccion | null>(LARGA);
  const [vig, setVig] = useState({ desde: "2026-10-01", hasta: "" });
  return (
    <div data-testid="formulario-qa" className="grid gap-6 md:grid-cols-3">
      <section className="flex flex-col gap-3">
        <Campo
          etiqueta="Cuenta"
          htmlFor="q-cuenta"
          ayuda="Busca por nombre, razón social o RUT. Se muestran primero las cuentas activas."
        >
          <Combobox
            id="q-cuenta"
            placeholder="Buscar cuenta"
            opciones={[]}
            onCambiar={() => undefined}
          />
        </Campo>
      </section>
      <section className="flex flex-col gap-3">
        <Campo etiqueta="Dirección" htmlFor="q-dir">
          <CampoDireccion
            id="q-dir"
            valor={dir}
            onCambiar={setDir}
            geocercaM={300}
            buscar={async () => []}
            resolver={async () => LARGA}
          />
        </Campo>
        <InputFechaRango desde={vig.desde} hasta={vig.hasta} onCambiar={setVig} />
      </section>
      <section className="flex flex-col gap-3">
        <Campo etiqueta="Copiar puestos" htmlFor="q-copia">
          <Combobox
            id="q-copia"
            placeholder="Elegir instalación"
            opciones={[]}
            onCambiar={() => undefined}
          />
        </Campo>
      </section>
    </div>
  );
}
