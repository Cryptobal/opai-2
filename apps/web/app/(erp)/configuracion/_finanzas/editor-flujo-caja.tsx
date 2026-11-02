"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Checkbox, Campo, Input, Select, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { FilaFlujo, AjustesFlujo } from "@/app/(erp)/finanzas/flujo/_componentes/datos";

export function EditorFlujoCaja({
  filas,
  ajustes,
}: {
  filas: FilaFlujo[];
  ajustes: AjustesFlujo;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [etiqueta, setEtiqueta] = useState("");
  const [seccion, setSeccion] = useState<"ingreso" | "egreso">("ingreso");
  const [aj, setAj] = useState(ajustes);

  async function crearFila() {
    const r = await ejecutar("finanzas.filas.crear", { seccion, etiqueta, arrastre: false });
    if (!r) return;
    avisar.exito("Fila creada");
    setEtiqueta("");
  }

  async function guardarAjustes() {
    const r = await ejecutar("finanzas.ajustes.actualizar", aj);
    if (!r) return;
    avisar.exito("Ajustes guardados");
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-fg">Filas</h2>
        <ul className="text-sm text-fg-muted">
          {filas.map((f) => (
            <li key={f.id}>
              {f.etiqueta} · {f.seccion} {f.activa ? "" : "· inactiva"}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <Campo etiqueta="Nueva fila" htmlFor="ff-etiq">
            <Input id="ff-etiq" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} />
          </Campo>
          <Select
            aria-label="Sección de la fila"
            valor={seccion}
            onCambiar={(v) => setSeccion(v as "ingreso" | "egreso")}
            opciones={[
              { valor: "ingreso", etiqueta: "Ingreso" },
              { valor: "egreso", etiqueta: "Egreso" },
            ]}
          />
          <Button disabled={pendiente || etiqueta.trim().length < 2} onClick={() => void crearFila()}>
            Agregar fila
          </Button>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-fg">Saldo inicial y aviso</h2>
        <Campo etiqueta="Saldo inicial (CLP)" htmlFor="aj-si">
          <Input
            id="aj-si"
            value={String(aj.saldoInicial)}
            onChange={(e) => setAj({ ...aj, saldoInicial: Number(e.target.value) || 0 })}
            inputMode="numeric"
          />
        </Campo>
        <Campo etiqueta="Umbral planilla (CLP)" htmlFor="aj-um">
          <Input
            id="aj-um"
            value={String(aj.umbral)}
            onChange={(e) => setAj({ ...aj, umbral: Number(e.target.value) || 0 })}
            inputMode="numeric"
          />
        </Campo>
        <Campo etiqueta="Semana desde (lunes ISO)" htmlFor="aj-des">
          <Input
            id="aj-des"
            value={aj.desde}
            onChange={(e) => setAj({ ...aj, desde: e.target.value })}
          />
        </Campo>
        <Checkbox
          marcado={aj.avisoActivo}
          onCambiar={(m) => setAj({ ...aj, avisoActivo: m })}
          etiqueta="Aviso in-app de saldo bajo umbral"
          descripcion="Emite evento y banner; sin correo externo (CAR-136)."
        />
        <Campo etiqueta="Umbral del aviso (CLP)" htmlFor="aj-au">
          <Input
            id="aj-au"
            value={String(aj.avisoUmbral)}
            onChange={(e) => setAj({ ...aj, avisoUmbral: Number(e.target.value) || 0 })}
            inputMode="numeric"
          />
        </Campo>
        <Checkbox
          marcado={aj.metasVisibles}
          onCambiar={(m) => setAj({ ...aj, metasVisibles: m })}
          etiqueta="Mostrar metas de rendimiento bajo la planilla"
        />
        <Button disabled={pendiente} onClick={() => void guardarAjustes()}>
          Guardar ajustes
        </Button>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-fg">Calendario de pagos</h2>
        <p className="text-sm text-fg-muted">
          Días del mes para proyecciones automáticas cuando existan adaptadores de nómina e IVA.{" "}
          TODO(decisión Carlos): UI completa según diseño v3.
        </p>
        <Textarea
          value={JSON.stringify(aj.calendarioPagos, null, 2)}
          onChange={(e) => {
            try {
              setAj({ ...aj, calendarioPagos: JSON.parse(e.target.value) as Record<string, number> });
            } catch {
              /* espera JSON válido al guardar */
            }
          }}
          rows={4}
        />
      </section>
    </div>
  );
}
