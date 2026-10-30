"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Dialog, Input, InputFecha, Select } from "@opai/ds";
import { TIPOS_NOVEDAD } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CampoPersona } from "./campo-persona";
import { TIPO_NOVEDAD, UNIDAD } from "./etiquetas";
import type { Periodo } from "./tipos";

// Las cuotas de préstamo no se cargan a mano: salen del plan del préstamo (nomina.md R5).
const TIPOS = TIPOS_NOVEDAD.filter((t) => t !== "prestamo");

/** «Registrar novedad» (diseño 05): licencia, ausencia, horas extra, anticipo o descuento. */
export function FormNovedad({ periodo }: { periodo: Periodo }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  const [persona, setPersona] = useState<string | null>(null);
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("licencia");
  const [desde, setDesde] = useState(periodo.inicio);
  const [hasta, setHasta] = useState("");
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");
  const unidad = UNIDAD[tipo];

  async function guardar() {
    const numero = Number(valor.replace(",", "."));
    const r = await ejecutar("nomina.novedades.crear", {
      periodoId: periodo.id,
      personaId: persona,
      tipo,
      fechaDesde: desde,
      ...(hasta ? { fechaHasta: hasta } : {}),
      ...(unidad === "$" ? { montoClp: numero } : { cantidad: numero }),
      ...(nota.trim() ? { nota: nota.trim() } : {}),
    });
    if (r) {
      avisar.exito("Novedad registrada");
      setAbierto(false);
      setPersona(null);
      setValor("");
      setNota("");
    }
  }
  return (
    <>
      <Button onClick={() => (limpiarError(), setAbierto(true))}>Registrar novedad</Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Registrar novedad"
        descripcion={`Se carga en ${periodo.etiqueta}. Las fechas deben tocar el mes del período.`}
        acciones={<Button disabled={pendiente || !persona || !valor} onClick={() => void guardar()}>Registrar</Button>}
      >
        <div className="flex flex-col gap-3">
          <Campo etiqueta="Persona" htmlFor="nov-persona"><CampoPersona id="nov-persona" valor={persona} onCambiar={setPersona} /></Campo>
          <Campo etiqueta="Tipo" htmlFor="nov-tipo">
            <Select id="nov-tipo" valor={tipo} onCambiar={(v) => setTipo(v as typeof tipo)} opciones={TIPOS.map((t) => ({ valor: t, etiqueta: TIPO_NOVEDAD[t] }))} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Desde" htmlFor="nov-desde"><InputFecha id="nov-desde" valor={desde} onCambiar={setDesde} /></Campo>
            <Campo etiqueta="Hasta (opcional)" htmlFor="nov-hasta"><InputFecha id="nov-hasta" valor={hasta} onCambiar={setHasta} /></Campo>
          </div>
          <Campo etiqueta={unidad === "$" ? "Monto ($)" : `Cantidad (${unidad})`} htmlFor="nov-valor">
            <Input id="nov-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <Campo etiqueta="Nota (sin datos médicos)" htmlFor="nov-nota">
            <Input id="nov-nota" maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} />
          </Campo>
          {error ? <Alerta tono="danger" titulo={error} /> : null}
        </div>
      </Dialog>
    </>
  );
}
