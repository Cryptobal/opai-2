"use client";

import { useState } from "react";

import { Alerta, Button, Campo, Input, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type KeyCreada, SecretoCreado } from "./secreto-creado";
import { ModulosKey, PermisosKey } from "./permisos-key";
import { montoUsd } from "./monto";
import { PresupuestoKey } from "./presupuesto-key";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  scopesDisponibles: string[];
  permisosDisponibles: string[];
  puedeCrearServicio: boolean;
};

/** Crear API key: nombre y scopes ("todos" o módulos). El secreto se muestra una vez en un diálogo. */
export function CrearApiKey({
  abierto,
  onCerrar,
  scopesDisponibles,
  permisosDisponibles,
  puedeCrearServicio,
}: Props) {
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
  const tope = montoUsd(presupuesto);
  const montoInvalido = presupuesto.trim() !== "" && tope === null;
  const configuracionInvalida =
    montoInvalido ||
    (servicio && tope === null) ||
    ((servicio || !hereda) && permisos.length === 0);
  const deshabilitado =
    enviando ||
    nombre.trim().length < 2 ||
    (!todos && modulos.length === 0) ||
    configuracionInvalida;

  const limpiar = () => {
    setNombre("");
    setPresupuesto("");
    setTodos(false);
    setServicio(false);
    setHereda(true);
    setPermisos([]);
    setModulos(["core"]);
    limpiarError();
  };

  async function crear() {
    if (deshabilitado) return;
    setEnviando(true);
    const r = await ejecutar<{ secreto: string }>("core.apikeys.create", {
      nombre,
      tipo: servicio ? "servicio" : "usuario",
      ...(servicio || !hereda ? { permisos } : {}),
      scopes: todos ? ["*"] : modulos,
      ...(tope !== null ? { presupuestoMensualUsd: tope } : {}),
    });
    setEnviando(false);
    if (r?.secreto) {
      onCerrar();
      setCreada({
        secreto: r.secreto,
        nombre,
        resumen: `Scopes: ${todos ? "todos los módulos" : modulos.join(", ")} · ${tope !== null ? `presupuesto US$ ${tope.toLocaleString("es-CL", { maximumFractionDigits: 6 })} al mes` : "sin presupuesto"} · irreversibles con aprobación`,
      });
      limpiar();
    }
  }

  const cerrar = () => {
    limpiar();
    onCerrar();
  };

  return (
    <>
      <Sheet
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Crear key"
        acciones={
          <Button block size="lg" disabled={deshabilitado} onClick={crear}>
            {enviando ? "Creando…" : "Crear"}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? (
            <Alerta tono="danger" titulo="No se pudo crear la key">
              {error}
            </Alerta>
          ) : null}
          {puedeCrearServicio ? (
            <Switch
              etiqueta="Agente de servicio"
              activo={servicio}
              onCambiar={setServicio}
              descripcion={
                servicio
                  ? "Sin rol heredado. Los permisos nunca superan los actuales del responsable."
                  : "Vía usuario: permisos y alcance del responsable, acotados por la key."
              }
            />
          ) : null}
          <Campo etiqueta="Nombre" htmlFor="key-nombre" ayuda="Para reconocerla: Grokbot, Claude…">
            <Input
              id="key-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="off"
            />
          </Campo>
          <PresupuestoKey
            valor={presupuesto}
            invalido={montoInvalido}
            servicio={servicio}
            onCambiar={setPresupuesto}
          />
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
