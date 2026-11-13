"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, InputFecha, Select, Sheet, Switch, Textarea } from "@opai/ds";

import { useHojaUrl, useParametros } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { hoyIso } from "@/lib/fechas";

import { CamposUf } from "./campos-uf";
import { type FilaEgreso, montoEditable, montoEscrito, type PoliticaUf, type Recurrente, type Unidad } from "./tipos";

const UNIDADES = [
  { valor: "clp", etiqueta: "Pesos" },
  { valor: "uf", etiqueta: "UF" },
  { valor: "pct_ventas", etiqueta: "% de las ventas netas del mes anterior" },
];
const FRECUENCIAS = [
  { valor: "mensual", etiqueta: "Mensual" },
  { valor: "quincenal", etiqueta: "Cada dos semanas" },
  { valor: "semanal", etiqueta: "Semanal" },
];

/** Nuevo gasto recurrente o editar uno existente (CAR-382). La fila, la frecuencia y el inicio no cambian al editar. */
export function HojaRecurrente(p: { items: Recurrente[]; filas: FilaEgreso[] }) {
  const id = useParametros().valor("editar");
  const r = p.items.find((x) => x.id === id);
  const hoja = useHojaUrl(id ? "editar" : "nuevo");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [fila, setFila] = useState(r?.filaId ?? p.filas[0]?.id ?? "");
  const [concepto, setConcepto] = useState(r?.concepto ?? "");
  const [unidad, setUnidad] = useState<Unidad>(r?.unidad ?? "clp");
  const [monto, setMonto] = useState(r ? montoEditable(r) : "");
  const [frecuencia, setFrecuencia] = useState(r?.frecuencia ?? "mensual");
  // Sin día guardado, el mensual se paga el día de su inicio (como lo muestra la lista).
  const [dia, setDia] = useState(r ? String(r.diaDelMes ?? Number(r.inicio.slice(8, 10))) : "1");
  const [inicio, setInicio] = useState(r?.inicio ?? hoyIso());
  const [fin, setFin] = useState(r?.fin ?? "");
  const [politica, setPolitica] = useState<PoliticaUf>(r?.politicaUf ?? "dia_cuota");
  const [ufDia, setUfDia] = useState(r?.ufDiaFijo != null ? String(r.ufDiaFijo) : "1");
  const [nota, setNota] = useState(r?.nota ?? "");
  const [activa, setActiva] = useState(r?.activa ?? true);
  if (id && !r) return null;

  const montoN = montoEscrito(unidad, monto);
  const diaN = Number(dia);
  const diaOk = frecuencia !== "mensual" || diaN === -1 || (diaN >= 1 && diaN <= 31);
  const ufDiaOk = unidad !== "uf" || politica !== "dia_fijo" || (Number(ufDia) >= 1 && Number(ufDia) <= 31);
  const listo = concepto.trim().length >= 2 && montoN !== null && diaOk && ufDiaOk && !!inicio && (!fin || fin >= inicio) && !!fila;

  async function guardar() {
    if (montoN === null) return;
    const comunes = {
      concepto: concepto.trim(),
      unidad,
      monto: montoN,
      politicaUf: unidad === "uf" ? politica : "dia_cuota",
      ufDiaFijo: unidad === "uf" && politica === "dia_fijo" ? Number(ufDia) : null,
      diaDelMes: frecuencia === "mensual" ? diaN : null,
      fin: fin || null,
      nota: nota.trim() || null,
    };
    const res = await ejecutar<Recurrente>(
      r ? "finanzas.recurrentes.actualizar" : "finanzas.recurrentes.crear",
      r ? { id: r.id, ...comunes, activa } : { filaId: fila, frecuencia, inicio, ...comunes },
    );
    if (!res) return;
    avisar.exito(r ? "Gasto recurrente actualizado" : "Gasto recurrente creado");
    hoja.cerrar();
    router.refresh();
  }

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={r ? "Editar gasto recurrente" : "Nuevo gasto recurrente"}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>Cancelar</Button>
          <Button disabled={pendiente || !listo} onClick={() => void guardar()}>{pendiente ? "Guardando…" : r ? "Guardar" : "Crear"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Fila del flujo" htmlFor="rc-fila" {...(r ? { ayuda: "La fila no se cambia; crea uno nuevo en la otra fila." } : {})}>
          <Select id="rc-fila" valor={fila} onCambiar={setFila} disabled={!!r} opciones={p.filas.map((f) => ({ valor: f.id, etiqueta: f.etiqueta }))} />
        </Campo>
        <Campo etiqueta="Concepto" htmlFor="rc-concepto">
          <Input id="rc-concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} autoFocus={!r} />
        </Campo>
        <Campo etiqueta="Unidad del monto" htmlFor="rc-unidad">
          <Select id="rc-unidad" valor={unidad} onCambiar={(v) => { setUnidad(v as Unidad); setMonto(""); }} opciones={UNIDADES} />
        </Campo>
        <Campo etiqueta={unidad === "clp" ? "Monto por cuota ($)" : unidad === "uf" ? "UF por cuota" : "Porcentaje (%)"} htmlFor="rc-monto" {...(unidad === "clp" ? {} : { ayuda: "Usa coma para los decimales (12,5)." })} {...(monto && montoN === null ? { error: unidad === "pct_ventas" ? "Un número entre 0 y 100." : "Un número mayor que cero." } : {})}>
          <Input id="rc-monto" inputMode="decimal" className="t-numeric" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </Campo>
        {unidad === "uf" ? <CamposUf politica={politica} onPolitica={setPolitica} dia={ufDia} onDia={setUfDia} diaOk={ufDiaOk} /> : null}
        <Campo etiqueta="Frecuencia" htmlFor="rc-frecuencia">
          <Select id="rc-frecuencia" valor={frecuencia} onCambiar={(v) => setFrecuencia(v as Recurrente["frecuencia"])} disabled={!!r} opciones={FRECUENCIAS} />
        </Campo>
        {frecuencia === "mensual" ? (
          <Campo etiqueta="Día de pago" htmlFor="rc-dia" ayuda="1 a 31 (se ajusta en meses cortos) o -1 para el último día." {...(diaOk ? {} : { error: "Del 1 al 31, o -1." })}>
            <Input id="rc-dia" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value.replace(/[^\d-]/g, ""))} />
          </Campo>
        ) : null}
        <Campo etiqueta="Desde" htmlFor="rc-inicio">
          <InputFecha id="rc-inicio" valor={inicio} onCambiar={setInicio} disabled={!!r} />
        </Campo>
        <Campo etiqueta="Hasta (opcional)" htmlFor="rc-fin" {...(fin && fin < inicio ? { error: "No puede ser antes del inicio." } : {})}>
          <InputFecha id="rc-fin" valor={fin} onCambiar={setFin} />
        </Campo>
        <Campo etiqueta="Nota" htmlFor="rc-nota">
          <Textarea id="rc-nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
        </Campo>
        {r ? <Switch etiqueta="Activo" descripcion="Pausado deja de proyectarse; las cuotas ya pagadas no cambian." activo={activa} onCambiar={setActiva} /> : null}
      </div>
    </Sheet>
  );
}
