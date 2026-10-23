"use client";

import { useState } from "react";

import { Button, Campo, Input, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type KeyCreada, SecretoCreado } from "./secreto-creado";

type Props = { abierto: boolean; onCerrar: () => void; scopesDisponibles: string[] };

/** Crear API key: nombre y scopes ("todos" o módulos). El secreto se muestra una vez en un diálogo. */
export function CrearApiKey({ abierto, onCerrar, scopesDisponibles }: Props) {
  const { ejecutar, error, limpiarError } = useCapacidad("erp");
  const [nombre, setNombre] = useState("");
  const [todos, setTodos] = useState(true);
  const [modulos, setModulos] = useState<string[]>(["core"]);
  const [presupuesto, setPresupuesto] = useState("");
  const [creada, setCreada] = useState<KeyCreada | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear() {
    setEnviando(true);
    const tope = Number(presupuesto);
    const r = await ejecutar<{ secreto: string }>("core.apikeys.create", {
      nombre,
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
          <Campo
            etiqueta="Presupuesto mensual (US$)"
            htmlFor="key-tope"
            ayuda="Al 80 % avisamos; al 100 % se detiene. Vacío: sin límite."
          >
            <Input
              id="key-tope"
              inputMode="decimal"
              value={presupuesto}
              onChange={(e) => setPresupuesto(e.target.value.replace(/[^\d.]/g, ""))}
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
      <SecretoCreado k={creada} onCerrar={() => setCreada(null)} />
    </>
  );
}
