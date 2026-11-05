"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Calculo, ModuloCobro } from "../../../facturacion/_componentes/cobro";
import { CamposCondicion } from "./campos-condicion";
import { formulario, type Formulario, VistaPreviaCobro } from "./vista-previa-cobro";

type Salida = { mesEnCurso: Calculo };

const entrada = (tenantId: string, moduloId: string, f: Formulario | null) => ({
  tenantId,
  moduloId,
  condicion: f
    ? {
        moneda: f.moneda,
        precioMensual: f.precio,
        cobroDesde: f.cobroDesde || null,
        pruebaHasta: f.pruebaHasta || null,
        descuentoPorcentaje: Number(f.descuento.replace(",", ".") || "0"),
        nota: f.nota || null,
      }
    : null,
});

/**
 * Hoja «Cobro» de un módulo. Mientras se escribe, la vista previa (`dryRun`) muestra cómo queda el
 * cobro del mes en curso; guardar o quitar la condición es lo único que escribe. El padre la monta
 * con `key` por módulo, así el formulario parte siempre de la condición guardada.
 */
export function HojaCondicion(props: {
  tenantId: string;
  modulo: ModuloCobro | null;
  onCerrar: () => void;
}) {
  const { tenantId, modulo, onCerrar } = props;
  // Un solo hook: guardar y la vista previa comparten `ejecutar` (el gate de paridad lee su id literal).
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [f, setF] = useState<Formulario>(() => formulario(modulo?.condicion ?? null));
  const [calculo, setCalculo] = useState<Calculo | null>(null);
  const [quitar, setQuitar] = useState(false);
  const moduloId = modulo?.moduloId ?? "";
  const listo = Boolean(moduloId && f.precio && (f.cobroDesde || f.pruebaHasta));

  useEffect(() => {
    if (!listo) return;
    const t = setTimeout(async () => {
      const r = await ejecutar<Salida>(
        "platform.cobros.condiciones_set",
        entrada(tenantId, moduloId, f),
        true,
        "ninguna",
      );
      setCalculo(r?.mesEnCurso ?? null);
    }, 300);
    return () => clearTimeout(t);
  }, [f, listo, tenantId, moduloId, ejecutar]);

  async function correr(conCondicion: boolean) {
    const r = await ejecutar(
      "platform.cobros.condiciones_set",
      entrada(tenantId, moduloId, conCondicion ? f : null),
    );
    if (r) {
      avisar.exito(conCondicion ? "Condición guardada" : "Condición quitada");
      onCerrar();
    }
  }
  return (
    <Sheet
      abierto={Boolean(modulo)}
      onCerrar={onCerrar}
      titulo={modulo ? `Cobro de ${modulo.nombre}` : "Cobro"}
      descripcion="Precio mensual de este módulo para esta empresa. No se emite ninguna factura."
      acciones={
        <>
          {modulo?.condicion ? (
            <Button
              variant={quitar ? "destructive" : "ghost"}
              disabled={pendiente}
              onClick={() => (quitar ? void correr(false) : setQuitar(true))}
            >
              {quitar ? "Confirmar: dejar de cobrar" : "Quitar condición"}
            </Button>
          ) : null}
          <Button disabled={pendiente || !listo} onClick={() => void correr(true)}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <CamposCondicion f={f} setF={setF} />
        <VistaPreviaCobro
          calculo={listo ? calculo : null}
          moneda={f.moneda}
          pendiente={pendiente}
          listo={listo}
        />
      </div>
    </Sheet>
  );
}
