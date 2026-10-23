"use client";

import { useState } from "react";

import { Button, Campo, Input, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { SecretoCreado } from "./secreto-creado";

type Props = { abierto: boolean; onCerrar: () => void; scopesDisponibles: string[] };

/** Crear API key: nombre y scopes ("todos" o módulos). El secreto se muestra una vez en un diálogo. */
export function CrearApiKey({ abierto, onCerrar, scopesDisponibles }: Props) {
  const { ejecutar, error, limpiarError } = useCapacidad("erp");
  const [nombre, setNombre] = useState("");
  const [todos, setTodos] = useState(true);
  const [modulos, setModulos] = useState<string[]>(["core"]);
  const [secreto, setSecreto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear() {
    setEnviando(true);
    const r = await ejecutar<{ secreto: string }>("core.apikeys.create", {
      nombre,
      scopes: todos ? ["*"] : modulos,
    });
    setEnviando(false);
    if (r?.secreto) {
      onCerrar();
      setSecreto(r.secreto);
      setNombre("");
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
        titulo="Crear API key"
        acciones={
          <Button block size="lg" disabled={enviando || nombre.trim().length < 2} onClick={crear}>
            {enviando ? "Creando…" : "Crear"}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
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
          <Switch
            etiqueta="Todos los módulos"
            descripcion="Incluye los que se activen después"
            activo={todos}
            onCambiar={setTodos}
          />
          {todos ? null : (
            <div className="divide-y divide-border">
              {scopesDisponibles.map((s) => (
                <Switch
                  key={s}
                  etiqueta={s === "core" ? "Núcleo (core)" : s}
                  activo={modulos.includes(s)}
                  onCambiar={(on) =>
                    setModulos(on ? [...modulos, s] : modulos.filter((m) => m !== s))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </Sheet>
      <SecretoCreado secreto={secreto} onCerrar={() => setSecreto(null)} />
    </>
  );
}
