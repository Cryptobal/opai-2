"use client";

import { useCallback, useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Checkbox, Combobox, ParesGrid, RadioGroup, Sheet } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { PasosFusion } from "../../cuentas/_componentes/fusion-pasos";

type Lado = "este" | "duplicado";
type Previa = {
  comparacion: { campo: string; etiqueta: string; este: string | null; duplicado: string | null; queda: Lado }[];
  mueve: { cuentas: number; negocios: number; actividad: number; documentos: number; firmas: number };
};
type Opcion = { valor: string; etiqueta: string };

async function buscar(q: string, excepto: string): Promise<Opcion[]> {
  const r = await ejecutarCapacidad("erp", "comercial.contactos.list", { q: q.trim() || undefined, limite: 20 }).catch(() => null);
  if (!r?.ok) return [];
  const items = (r.data as { items: { id: string; nombre: string; cuentaNombre: string; email: string | null }[] }).items;
  return items
    .filter((c) => c.id !== excepto)
    .map((c) => ({ valor: c.id, etiqueta: [c.nombre, c.cuentaNombre, c.email].filter(Boolean).join(" · ") }));
}

const MUEVE: [keyof Previa["mueve"], string][] = [
  ["cuentas", "Cuentas"],
  ["negocios", "Negocios"],
  ["actividad", "Actividad"],
  ["documentos", "Documentos"],
  ["firmas", "Firmas"],
];

/** «Fusionar contactos»: Elegir → Comparar → Resumen, con la vista previa de `core.contactos.fusionar`. */
export function HojaFusionarContacto({ contacto }: { contacto: { id: string; nombre: string } }) {
  const hoja = useHojaUrl("fusionar");
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [paso, setPaso] = useState(0);
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [duplicadoId, setDuplicadoId] = useState("");
  const [elegir, setElegir] = useState<Record<string, Lado>>({});
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [entiendo, setEntiendo] = useState(false);
  const onBuscar = useCallback(async (q: string) => {
    const o = await buscar(q, contacto.id);
    setOpciones((prev) => [...prev, ...o.filter((x) => !prev.some((v) => v.valor === x.valor))]);
    return o;
  }, [contacto.id]);
  useEffect(() => {
    void buscar(contacto.nombre.split(/\s+/)[0] ?? "", contacto.id).then(setOpciones);
  }, [contacto.id, contacto.nombre]);

  const entrada = { contactoId: contacto.id, duplicadoId, elegir };
  async function verPrevia(siguiente: number) {
    const r = await ejecutar<Previa>("core.contactos.fusionar", entrada, true, "ninguna");
    if (!r) return;
    setPrevia(r);
    setElegir(Object.fromEntries(r.comparacion.map((c) => [c.campo, c.queda])));
    setPaso(siguiente);
  }
  async function fusionar() {
    if (!(await ejecutar("core.contactos.fusionar", entrada))) return;
    avisar.exito("Contactos fusionados");
    hoja.cerrar();
  }
  const atras = () => {
    limpiarError();
    setPaso(paso - 1);
  };
  const distintos = previa?.comparacion.filter((c) => c.este !== c.duplicado) ?? [];
  const siguiente = paso === 0 ? "Comparar" : "Revisar resumen";

  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Fusionar contactos"
      descripcion={`${contacto.nombre} con un duplicado`}
      acciones={
        <>
          <Button variant="secondary" onClick={paso === 0 ? hoja.cerrar : atras}>{paso === 0 ? "Cancelar" : "Atrás"}</Button>
          {paso < 2 ? (
            <Button disabled={!duplicadoId || pendiente} onClick={() => void verPrevia(paso + 1)}>{siguiente}</Button>
          ) : (
            <Button variant="destructive" disabled={!entiendo || pendiente} onClick={() => void fusionar()}>Fusionar</Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <PasosFusion actual={paso} />
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {paso === 0 ? (
          <Campo etiqueta="Contacto duplicado" htmlFor="fusion-contacto" ayuda="Busca por nombre o correo. Este contacto es el que queda.">
            <Combobox id="fusion-contacto" valor={duplicadoId} onCambiar={([v]) => setDuplicadoId(v ?? "")} opciones={opciones} onBuscar={onBuscar} placeholder="Buscar contacto" />
          </Campo>
        ) : null}
        {paso === 1 ? (
          distintos.length === 0 ? (
            <Alerta tono="info" titulo="Los datos de los dos contactos son iguales; no hay nada que elegir." />
          ) : (
            distintos.map((c) => (
              <RadioGroup
                key={c.campo}
                etiqueta={c.etiqueta}
                orientacion="fila"
                valor={elegir[c.campo] ?? c.queda}
                onCambiar={(v) => setElegir({ ...elegir, [c.campo]: v as Lado })}
                opciones={[
                  { valor: "este", etiqueta: c.este ?? "Vacío", descripcion: `${c.etiqueta} · este contacto` },
                  { valor: "duplicado", etiqueta: c.duplicado ?? "Vacío", descripcion: `${c.etiqueta} · duplicado` },
                ]}
              />
            ))
          )
        ) : null}
        {paso === 2 && previa ? (
          <>
            <p className="t-body-sm">Pasan a «{contacto.nombre}» y el duplicado se elimina:</p>
            <ParesGrid items={MUEVE.map(([k, etiqueta]) => ({ etiqueta, valor: String(previa.mueve[k]) }))} />
            <Alerta tono="danger" titulo="Fusionar no se puede deshacer. El duplicado deja de existir; su historial queda en este contacto." />
            <Checkbox marcado={entiendo} onCambiar={setEntiendo} etiqueta="Entiendo que es irreversible" />
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
