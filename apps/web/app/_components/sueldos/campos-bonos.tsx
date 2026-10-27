"use client";

import { Button, Campo, Checkbox, Input, Select } from "@opai/ds";
import type { ItemEstructura } from "@/lib/tipos-sueldo";
import type { DatosCapa } from "./campos-capa";
import { errorMonto, parsearMonto } from "./monto";

export function CamposBonos({
  datos: d,
  cambiar,
}: {
  datos: DatosCapa;
  cambiar: (d: DatosCapa) => void;
}) {
  const bono = (
    indice: number,
    cambios: Partial<ItemEstructura & { montoTexto: string; porcentajeTexto: string }>,
  ) => cambiar({ ...d, items: d.items.map((i, j) => (j === indice ? { ...i, ...cambios } : i)) });
  return (
    <>
      <h3 className="t-subheading">Bonos de esta capa</h3>
      {d.items.map((i, j) => (
        <fieldset key={j} className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <legend className="t-label">Bono {j + 1}</legend>
          <Campo etiqueta="Nombre del bono (obligatorio)" htmlFor={`b-n-${j}`}>
            <Input
              id={`b-n-${j}`}
              value={i.nombre}
              onChange={(e) => bono(j, { nombre: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Tipo de bono" htmlFor={`b-t-${j}`}>
            <Select
              id={`b-t-${j}`}
              valor={i.tipo}
              onCambiar={(v) =>
                bono(j, {
                  tipo: v as ItemEstructura["tipo"],
                  monto: null,
                  porcentaje: null,
                  montoTexto: "",
                  porcentajeTexto: "",
                })
              }
              opciones={[
                { valor: "bono_fijo", etiqueta: "Monto fijo" },
                { valor: "bono_porcentual", etiqueta: "Porcentual" },
              ]}
            />
          </Campo>
          <Campo
            etiqueta={
              i.tipo === "bono_fijo"
                ? "Monto del bono (obligatorio)"
                : "Porcentaje (escala: 10000 = 1 %)"
            }
            htmlFor={`b-m-${j}`}
            error={i.tipo === "bono_fijo" ? errorMonto(i.montoTexto) : undefined}
          >
            <Input
              id={`b-m-${j}`}
              aria-invalid={Boolean(
                i.tipo === "bono_fijo" && i.montoTexto && parsearMonto(i.montoTexto) === null,
              )}
              aria-describedby={
                i.tipo === "bono_fijo" && i.montoTexto && parsearMonto(i.montoTexto) === null
                  ? `b-m-${j}-error`
                  : undefined
              }
              inputMode="numeric"
              value={i.tipo === "bono_fijo" ? i.montoTexto : i.porcentajeTexto}
              onChange={(e) =>
                bono(
                  j,
                  i.tipo === "bono_fijo"
                    ? { montoTexto: e.target.value, monto: parsearMonto(e.target.value) }
                    : {
                        porcentajeTexto: e.target.value,
                        porcentaje: /^\d+$/.test(e.target.value) ? Number(e.target.value) : null,
                      },
                )
              }
            />
          </Campo>
          <Checkbox
            etiqueta="Imponible"
            marcado={i.imponible}
            onCambiar={(v) => bono(j, { imponible: v })}
          />
          <Button
            variant="ghost"
            onClick={() => cambiar({ ...d, items: d.items.filter((_, n) => n !== j) })}
          >
            Quitar bono {j + 1}
          </Button>
        </fieldset>
      ))}
      <Button
        variant="secondary"
        disabled={d.items.length >= 30}
        onClick={() =>
          cambiar({
            ...d,
            items: [
              ...d.items,
              {
                nombre: "",
                tipo: "bono_fijo",
                monto: null,
                porcentaje: null,
                montoTexto: "",
                porcentajeTexto: "",
                imponible: true,
                tributable: true,
              },
            ],
          })
        }
      >
        Agregar bono
      </Button>
    </>
  );
}
