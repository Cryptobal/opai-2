"use client";

import { useState } from "react";

import {
  Alerta,
  Button,
  ChipsEtiquetas,
  CompositorActividad,
  type EtiquetaChip,
  TareaFila,
  type TipoCompositor,
} from "@opai/ds";

const CATALOGO: EtiquetaChip[] = [
  { id: "a", nombre: "Minería", tono: "info" },
  { id: "b", nombre: "Cliente clave", tono: "success" },
  { id: "c", nombre: "Pago lento", tono: "warning" },
  { id: "d", nombre: "Evitar", tono: "danger" },
  { id: "e", nombre: "Referido", tono: "neutral" },
];

/** ChipsEtiquetas (CAR-162): con permiso (quitar y agregar), de solo lectura y vacío. */
export function MuestraEtiquetas() {
  const [ids, setIds] = useState(["a", "b"]);
  const activas = CATALOGO.filter((e) => ids.includes(e.id));
  return (
    <div className="flex flex-col gap-4">
      <ChipsEtiquetas
        etiquetas={activas}
        disponibles={CATALOGO.filter((e) => !ids.includes(e.id))}
        onAgregar={(id) => setIds([...ids, id])}
        onQuitar={(id) => setIds(ids.filter((x) => x !== id))}
        onCrear={() => undefined}
      />
      <ChipsEtiquetas etiquetas={CATALOGO.slice(0, 3)} />
      <ChipsEtiquetas etiquetas={[]} vacio="Esta ficha no tiene etiquetas." />
    </div>
  );
}

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
