"use client";

import { Button, Input } from "@opai/ds";
import { Sparkles, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { abrirAgente } from "./abrir-agente";
import { HiloAgente } from "./hilo-agente";
import { preguntasDeFicha } from "./preguntas-ficha";
import type { Contexto } from "./tipos";
import { useAgente } from "./use-agente";

type Props = { contexto: Contexto; nombre: string; onCerrar: () => void };

/**
 * El agente dentro de la ficha (ADR-109, CAR-335 D5; referente Attio): responde sobre esta ficha y
 * propone acciones con «Aprobar» o «Descartar» (las mismas tarjetas de plan del panel). Usa el mismo
 * motor que el panel (`useAgente`), con la ficha como contexto; el servidor revalida el acceso en cada
 * turno. «Seguir en el panel» continúa la misma conversación en el panel lateral.
 */
export function AgenteEnFicha({ contexto, nombre, onCerrar }: Props) {
  const a = useAgente("erp", true);
  const [texto, setTexto] = useState("");
  const { sobreFicha } = a;
  useEffect(() => {
    sobreFicha({ contexto, etiqueta: nombre });
  }, [sobreFicha, contexto, nombre]);
  const listo = Boolean(a.modelo) && !a.trabajando && !a.hayPlanPendiente;
  const preguntar = (pregunta: string) => {
    const limpio = pregunta.trim();
    if (!limpio || !listo) return;
    setTexto("");
    void a.enviar(limpio);
  };
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    preguntar(texto);
  };
  return (
    <section
      aria-label={`OPAI sobre ${nombre}`}
      data-testid="agente-en-ficha"
      className="mt-3 mb-4 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 flex-none text-accent" aria-hidden />
        <h2 className="t-label min-w-0 flex-1 truncate text-fg">OPAI sobre {nombre}</h2>
        <Button variant="ghost" size="iconSm" aria-label="Cerrar" onClick={onCerrar}>
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      {a.errorModelos ? (
        <p role="alert" className="t-caption text-danger-fg">
          No pudimos usar el agente. Avísale a un administrador: falta conectar un modelo de IA en
          Integraciones.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {preguntasDeFicha(contexto.tipo).map((p) => (
          <Button
            key={p}
            variant="secondary"
            className="rounded-full"
            disabled={!listo}
            onClick={() => preguntar(p)}
          >
            {p}
          </Button>
        ))}
      </div>
      {a.mensajes.length > 0 ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          <HiloAgente mensajes={a.mensajes} onDecidir={a.decidir} />
        </div>
      ) : null}
      <form onSubmit={enviar} className="flex items-center gap-2">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={`Pregunta algo sobre ${nombre}`}
          aria-label={`Pregunta a OPAI sobre ${nombre}`}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" disabled={!listo || !texto.trim()}>
          Preguntar
        </Button>
      </form>
      {a.conversacionId ? (
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => {
            const id = a.conversacionId;
            if (id) abrirAgente({ conversacionId: id });
            onCerrar();
          }}
        >
          Seguir en el panel
        </Button>
      ) : null}
    </section>
  );
}
