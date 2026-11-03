"use client";

import { useState } from "react";

import { Alerta, Button, CompositorActividad, TareaFila, type TipoCompositor } from "@opai/ds";

/** TareaFila (pendiente, hoy, vencida, hecha, solo lectura) y CompositorActividad (CAR-162). */
export function MuestraTareas() {
  const [hecha, setHecha] = useState(false);
  const [tipo, setTipo] = useState<TipoCompositor>("nota");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col">
        <TareaFila titulo="Llamar para confirmar la visita" vencimiento="Vencida hace 2 días" tono="danger" prioridad="Prioridad alta" responsables={["Camila Soto"]} hecha={false} onMarcar={() => undefined} />
        <TareaFila titulo="Enviar la propuesta corregida" vencimiento="Vence hoy 12:00" tono="warning" responsables={["Camila Soto", "Diego Rojas"]} hecha={hecha} onMarcar={setHecha} />
        <TareaFila titulo="Revisar contrato con legal" vencimiento="Vence mañana" tono="neutro" responsables={[]} hecha={false} onMarcar={() => undefined} />
        <TareaFila titulo="Tarea de otra persona (solo lectura)" vencimiento="Vence el 12-11-2026" tono="neutro" responsables={["Diego Rojas"]} hecha={false} />
        <TareaFila titulo="Guardada y bloqueada mientras se guarda" vencimiento="Vence hoy" tono="warning" responsables={[]} hecha={false} deshabilitada />
      </div>
      <CompositorActividad
        tipo={tipo}
        onTipo={setTipo}
        ayuda={tipo === "tarea" ? "Llega a Mis tareas de sus responsables" : "Puedes cambiar la fecha a una pasada"}
        error={<Alerta tono="danger" titulo="Ejemplo de error: no se pudo registrar." />}
        vinculos={[
          { clave: "n", etiqueta: "Negocio", valor: "Guardias · Planta 1" },
          { clave: "c", etiqueta: "Cuenta", valor: "Minera Norte", onQuitar: () => undefined },
        ]}
        accion={<Button>{tipo === "tarea" ? "Crear tarea" : "Registrar"}</Button>}
      >
        <p className="t-caption">Los campos de cada tipo los arma la pantalla que usa el componente.</p>
      </CompositorActividad>
    </div>
  );
}
