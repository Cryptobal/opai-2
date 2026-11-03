import { useState } from "react";

import { montoUsd } from "./monto";
import type { KeyCreada } from "./secreto-creado";

/** Estado del formulario «Crear key» y su validación. */
export function useFormKey(limpiarError: () => void) {
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
  return {
    nombre,
    setNombre,
    todos,
    setTodos,
    servicio,
    setServicio,
    hereda,
    setHereda,
    permisos,
    setPermisos,
    modulos,
    setModulos,
    presupuesto,
    setPresupuesto,
    creada,
    setCreada,
    enviando,
    setEnviando,
    tope,
    montoInvalido,
    deshabilitado,
    limpiar,
  };
}
