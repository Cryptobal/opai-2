"use client";

import { useState } from "react";

import { Alerta, avisar, Badge, Button, Input, SeccionTarjeta, Select, Switch } from "@opai/ds";

import type { Concepto } from "@/app/(erp)/remuneraciones/_componentes/tipos";
import { useCapacidad } from "@/app/_components/use-capacidad";

const TIPOS = [{ valor: "haber", etiqueta: "Haber" }, { valor: "descuento", etiqueta: "Descuento" }];

/** Conceptos de haberes y descuentos: tratamiento imponible y tributable y código LRE (siempre por verificar). */
export function EditorConceptos({ conceptos }: { conceptos: Concepto[] }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("haber");
  const [lre, setLre] = useState("");

  async function agregar() {
    const r = await ejecutar("nomina.conceptos.crear", {
      codigo: codigo.trim(), nombre: nombre.trim(), tipo, imponible: false, tributable: false,
      codigoLre: lre.trim() || null, orden: conceptos.length,
    });
    if (r) {
      avisar.exito("Concepto agregado");
      setCodigo(""); setNombre(""); setLre("");
    }
  }
  const actualizar = (c: Concepto, cambio: Partial<Concepto>) => ejecutar("nomina.conceptos.actualizar", { id: c.id, ...cambio });

  return (
    <SeccionTarjeta titulo="Conceptos de haberes y descuentos" sinRelleno>
      <p className="t-caption px-4 pt-3">
        El tratamiento (imponible, tributable) decide cómo entra cada concepto al cálculo. Los códigos del LRE están por verificar contra el suplemento oficial.
      </p>
      {error ? <Alerta tono="danger" titulo={error} className="mx-4 mt-3" /> : null}
      <ul className="flex flex-col">
        {conceptos.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
            <span className={`min-w-0 flex-1 truncate ${c.activo ? "" : "text-fg-subtle"}`}>{c.nombre}<span className="t-caption ml-2">{c.codigo}</span></span>
            <Badge tono={c.tipo === "haber" ? "success" : "warning"}>{c.tipo === "haber" ? "Haber" : "Descuento"}</Badge>
            {c.codigoLre ? <Badge tono="neutro">LRE {c.codigoLre} · por verificar</Badge> : null}
            <Switch etiqueta="Imponible" activo={c.imponible} disabled={pendiente} onCambiar={(v) => void actualizar(c, { imponible: v })} />
            <Switch etiqueta="Tributable" activo={c.tributable} disabled={pendiente} onCambiar={(v) => void actualizar(c, { tributable: v })} />
            <Switch soloControl etiqueta={`${c.nombre} activo`} activo={c.activo} disabled={pendiente} onCambiar={(v) => void actualizar(c, { activo: v })} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 p-4">
        <Input aria-label="Código interno" placeholder="codigo_interno" className="w-40" maxLength={40} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <Input aria-label="Nombre del concepto" placeholder="Nombre" className="min-w-0 flex-1" maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <div className="w-36"><Select aria-label="Tipo" valor={tipo} opciones={TIPOS} onCambiar={setTipo} /></div>
        <Input aria-label="Código LRE (por verificar)" placeholder="Código LRE" className="w-32" maxLength={10} value={lre} onChange={(e) => setLre(e.target.value)} />
        <Button variant="secondary" disabled={pendiente || codigo.trim().length < 2 || nombre.trim().length < 2} onClick={() => void agregar()}>Agregar</Button>
      </div>
    </SeccionTarjeta>
  );
}
