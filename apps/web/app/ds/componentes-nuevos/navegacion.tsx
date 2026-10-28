"use client";

import { Building2, Pin } from "lucide-react";
import { useState } from "react";

import { AreaGrupo, BotonFijar, Fijados, RadioGroup } from "@opai/ds";

export function MuestraNavegacion() {
  const [abierto, setAbierto] = useState(true);
  const [fijado, setFijado] = useState(false);
  const [area, setArea] = useState("clientes");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="group rounded-lg border border-border bg-surface p-3">
        <AreaGrupo
          etiqueta="Clientes"
          icono={Building2}
          abierto={abierto}
          activa
          onAlternar={() => setAbierto(!abierto)}
        >
          <p className="t-body-sm p-3">Cuentas · Instalaciones</p>
        </AreaGrupo>
        <BotonFijar variante="ficha" fijado={fijado} onFijar={() => setFijado(!fijado)} />
        <Fijados
          items={fijado ? [{ href: "/cuentas", etiqueta: "Cuentas", icono: Pin }] : []}
          rutaActual="/cuentas"
          onDesfijar={() => setFijado(false)}
        />
      </div>
      <RadioGroup
        etiqueta="Área principal"
        valor={area}
        opciones={[
          {
            valor: "clientes",
            etiqueta: "Clientes",
            descripcion: "Inicio · Cuentas · Instalaciones · Más",
          },
          {
            valor: "personas",
            etiqueta: "Personas",
            descripcion: "Inicio · Personas · Cargos y sueldos · Más",
          },
        ]}
        onCambiar={setArea}
      />
    </div>
  );
}
