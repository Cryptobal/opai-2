"use client";

import { useEffect, useState } from "react";

import { avisar, Button, Input, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Plantilla = { nombre: string; texto: string };
type Ajuste = { clave: string; valor: unknown };

const esPlantilla = (v: unknown): v is Plantilla => {
  const p = v as Partial<Plantilla> | null;
  return !!p && typeof p.nombre === "string" && typeof p.texto === "string";
};

/**
 * Plantillas de glosa de las facturas programadas (ajuste `finanzas.plantillas_glosa_ventas`): elegir una para llenar la
 * descripción de la línea, o guardar la descripción actual con un nombre. Los marcadores ({{periodo}}, {{uf_valor}},
 * {{uf_al_dia}}, {{monto}}) se resuelven al generar cada factura.
 */
export function SelectorPlantilla({
  glosaActual,
  onAplicar,
}: {
  glosaActual: string;
  onAplicar: (texto: string) => void;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [lista, setLista] = useState<Plantilla[]>([]);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    let cancelar = false;
    void ejecutar<Ajuste[]>("core.config.get", { modulo: "finanzas" }).then((r) => {
      if (cancelar) return;
      const valor = r?.find((a) => a.clave === "plantillas_glosa_ventas")?.valor;
      setLista(Array.isArray(valor) ? valor.filter(esPlantilla) : []);
    });
    return () => {
      cancelar = true;
    };
  }, [ejecutar]);

  const nombreOk = nombre.trim().length > 0 && glosaActual.trim().length > 0;

  async function guardar() {
    limpiarError();
    const nueva = [
      ...lista.filter((p) => p.nombre !== nombre.trim()),
      { nombre: nombre.trim(), texto: glosaActual.trim() },
    ];
    const r = await ejecutar("core.config.set", {
      modulo: "finanzas",
      clave: "plantillas_glosa_ventas",
      valor: nueva,
    });
    if (!r) return;
    setLista(nueva);
    setNombre("");
    avisar.exito("Plantilla guardada");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {lista.length > 0 ? (
        <div className="w-full sm:w-56">
          <Select
            aria-label="Usar una plantilla"
            placeholder="Usar una plantilla"
            valor={undefined}
            onCambiar={(n) => {
              const p = lista.find((x) => x.nombre === n);
              if (p) onAplicar(p.texto);
            }}
            opciones={lista.map((p) => ({
              valor: p.nombre,
              etiqueta: p.nombre,
              descripcion: p.texto,
            }))}
          />
        </div>
      ) : null}
      <Input
        aria-label="Nombre de la plantilla"
        placeholder="Nombre para guardar esta descripción"
        value={nombre}
        maxLength={60}
        onChange={(e) => setNombre(e.target.value)}
        className="min-w-0 flex-1"
      />
      <Button variant="secondary" disabled={pendiente || !nombreOk} onClick={() => void guardar()}>
        Guardar como plantilla
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
