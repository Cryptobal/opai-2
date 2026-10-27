"use client";

import { useState } from "react";

import { Button, Campo, Input, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type KeyCreada, SecretoCreado } from "./secreto-creado";
import { ModulosKey, PermisosKey } from "./permisos-key";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  scopesDisponibles: string[];
  permisosDisponibles: string[];
};

/** Crear API key: nombre y scopes ("todos" o módulos). El secreto se muestra una vez en un diálogo. */
export function CrearApiKey({ abierto, onCerrar, scopesDisponibles, permisosDisponibles }: Props) {
  const { ejecutar, error, limpiarError } = useCapacidad("erp");
  const [nombre, setNombre] = useState("");
  const [todos, setTodos] = useState(false);
  const [servicio, setServicio] = useState(false);
  const [hereda, setHereda] = useState(true);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [modulos, setModulos] = useState<string[]>(["core"]);
  const [presupuesto, setPresupuesto] = useState("");
  const [creada, setCreada] = useState<KeyCreada | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear() {
    setEnviando(true);
    const tope = Number(presupuesto);
    const r = await ejecutar<{ secreto: string }>("core.apikeys.create", {
      nombre,
      tipo: servicio ? "servicio" : "usuario",
      ...(servicio || !hereda ? { permisos } : {}),
      scopes: todos ? ["*"] : modulos,
      ...(tope > 0 ? { presupuestoMensualUsd: tope } : {}),
    });
    setEnviando(false);
    if (r?.secreto) {
      onCerrar();
      setCreada({
        secreto: r.secreto,
        nombre,
        resumen: `Scopes: ${todos ? "todos los módulos" : modulos.join(", ")} · ${tope > 0 ? `presupuesto US$ ${tope} al mes` : "sin presupuesto"} · irreversibles con aprobación`,
      });
      setNombre("");
      setPresupuesto("");
    }
  }

  const cerrar = () => {
    limpiarError();
    onCerrar();
  };

  return (
    <>
      <Sheet
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Crear key"
        acciones={
          <Button
            block
            size="lg"
            disabled={
              enviando ||
              nombre.trim().length < 2 ||
              (!todos && modulos.length === 0) ||
              (servicio && !(Number(presupuesto) > 0))
            }
            onClick={crear}
          >
            {enviando ? "Creando…" : "Crear"}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Switch
            etiqueta="Agente de servicio"
            activo={servicio}
            onCambiar={setServicio}
            descripcion={
              servicio
                ? "Sin rol heredado. Responsable solo para aprobaciones y avisos."
                : "Vía usuario: permisos y alcance del responsable, acotados por la key."
            }
          />
          <Campo
            etiqueta="Nombre"
            htmlFor="key-nombre"
            ayuda="Para reconocerla: Grokbot, Claude…"
            {...(error ? { error } : {})}
          >
            <Input
              id="key-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="off"
            />
          </Campo>
          <Campo
            etiqueta="Presupuesto mensual (US$)"
            htmlFor="key-tope"
            ayuda={
              servicio
                ? "Obligatorio para servicio, mayor que cero. Aviso al 80 % y corte al 100 %."
                : "Al 80 % avisamos; al 100 % se detiene. Vacío: sin límite."
            }
          >
            <Input
              id="key-tope"
              inputMode="decimal"
              value={presupuesto}
              onChange={(e) => setPresupuesto(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </Campo>
          <ModulosKey
            disponibles={scopesDisponibles}
            elegidos={modulos}
            todos={todos}
            onTodos={setTodos}
            onCambiar={setModulos}
          />
          {!servicio ? (
            <Switch
              etiqueta="Heredar permisos del responsable"
              activo={hereda}
              onCambiar={setHereda}
              descripcion="La key nunca supera los permisos efectivos ni el alcance del responsable."
            />
          ) : null}
          {servicio || !hereda ? (
            <PermisosKey
              disponibles={permisosDisponibles}
              elegidos={permisos}
              onCambiar={setPermisos}
            />
          ) : null}
        </div>
      </Sheet>
      <SecretoCreado k={creada} onCerrar={() => setCreada(null)} />
    </>
  );
}
