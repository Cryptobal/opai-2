import { Trash2 } from "lucide-react";

import { Button, Input, InputMonto, Select } from "@opai/ds";

import { ETIQUETA_CAMPO, OPERADORES, type CampoRegla, type CondicionEditable } from "./tipos-reglas";

const CAMPOS = (Object.keys(ETIQUETA_CAMPO) as CampoRegla[]).map((c) => ({ valor: c, etiqueta: ETIQUETA_CAMPO[c] }));

/** Filas de condiciones (campo · operador · valor), como el diseño «Editor de reglas» de Finanzas. */
export function EditorCondiciones({
  condiciones,
  onCambiar,
}: {
  condiciones: CondicionEditable[];
  onCambiar: (c: CondicionEditable[]) => void;
}) {
  const set = (i: number, p: Partial<CondicionEditable>) => onCambiar(condiciones.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <div className="flex flex-col gap-3">
      {condiciones.map((c, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_44px]">
          <Select
            aria-label={`Campo de la condición ${i + 1}`}
            valor={c.campo}
            opciones={CAMPOS}
            onCambiar={(v) => {
              const campo = v as CampoRegla;
              set(i, { campo, operador: OPERADORES[campo][0]!.valor, valor: "", hasta: undefined });
            }}
          />
          <Select
            aria-label={`Operador de la condición ${i + 1}`}
            valor={c.operador}
            opciones={OPERADORES[c.campo]}
            onCambiar={(v) => set(i, { operador: v as CondicionEditable["operador"] })}
          />
          <div className="col-span-3 row-start-2 flex gap-2 sm:col-span-1 sm:row-start-auto">
            {c.campo === "monto" ? (
              <>
                <InputMonto
                  aria-label={c.operador === "entre" ? "Desde" : "Monto"}
                  valor={c.valor}
                  onCambiar={(d) => set(i, { valor: d })}
                />
                {c.operador === "entre" ? (
                  <InputMonto
                    aria-label="Hasta"
                    valor={c.hasta != null ? String(c.hasta) : ""}
                    onCambiar={(d) => set(i, { hasta: d ? Number(d) : undefined })}
                  />
                ) : null}
              </>
            ) : (
              <Input
                aria-label={`Valor de la condición ${i + 1}`}
                className="t-mono"
                value={c.valor}
                placeholder={c.campo === "rut" ? "11.111.111-1" : "Texto de la glosa"}
                onChange={(e) => set(i, { valor: e.target.value })}
              />
            )}
          </div>
          <Button
            variant="ghost"
            aria-label={`Quitar la condición ${i + 1}`}
            disabled={condiciones.length === 1}
            onClick={() => onCambiar(condiciones.filter((_, j) => j !== i))}
          >
            <Trash2 aria-hidden className="size-4" />
          </Button>
        </div>
      ))}
      {condiciones.length < 8 ? (
        <Button variant="secondary" onClick={() => onCambiar([...condiciones, { campo: "glosa", operador: "contiene", valor: "" }])}>
          Agregar condición
        </Button>
      ) : null}
    </div>
  );
}
