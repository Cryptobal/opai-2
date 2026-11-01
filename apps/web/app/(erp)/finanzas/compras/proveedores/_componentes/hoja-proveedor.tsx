"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Switch, Textarea } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { type Centro, claveCentro, type Cuenta, type Proveedor, refDe } from "../../../_componentes/tipos";

const SIN = "__sin__";

/** Nuevo proveedor o editar el existente (plazo de pago, cuentas y centro de costo por defecto). */
export function HojaProveedor(p: { proveedor?: Proveedor; cuentas: Cuenta[]; centros: Centro[] }) {
  const { proveedor } = p;
  const hoja = useHojaUrl(proveedor ? "editar" : "nuevo");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [rut, setRut] = useState(proveedor?.rut ?? "");
  const [razon, setRazon] = useState(proveedor?.razonSocial ?? "");
  const [email, setEmail] = useState(proveedor?.email ?? "");
  const [plazo, setPlazo] = useState(String(proveedor?.plazoPagoDias ?? 30));
  const [gasto, setGasto] = useState(proveedor?.cuentaGastoId ?? SIN);
  const [pagar, setPagar] = useState(proveedor?.cuentaPorPagarId ?? SIN);
  const centroActual = p.centros.find((c) => c.id !== null && c.id === proveedor?.centroCostoId);
  const [centro, setCentro] = useState(centroActual ? claveCentro(centroActual) : SIN);
  const [notas, setNotas] = useState(proveedor?.notas ?? "");
  const [activo, setActivo] = useState(proveedor?.activo ?? true);

  async function guardar() {
    const elegido = p.centros.find((c) => claveCentro(c) === centro);
    const campos = {
      razonSocial: razon.trim(),
      email: email.trim() || null,
      plazoPagoDias: Number(plazo),
      cuentaGastoId: gasto === SIN ? null : gasto,
      cuentaPorPagarId: pagar === SIN ? null : pagar,
      centro: elegido ? refDe(elegido) : null,
      notas: notas.trim() || null,
    };
    const r = await ejecutar<Proveedor>(
      proveedor ? "finanzas.proveedores.actualizar" : "finanzas.proveedores.crear",
      proveedor ? { id: proveedor.id, ...campos, activo } : { rut: rut.trim(), ...campos },
    );
    if (!r) return;
    avisar.exito(proveedor ? "Proveedor actualizado" : "Proveedor creado");
    hoja.cerrar();
    if (!proveedor) router.push(`/finanzas/compras/proveedores/${r.id}`);
  }
  const opcionesCuenta = (tipos: string[]) => [
    { valor: SIN, etiqueta: "Sin cuenta por defecto" },
    ...p.cuentas.filter((c) => tipos.includes(c.tipo)).map((c) => ({ valor: c.id, etiqueta: `${c.codigo} · ${c.nombre}` })),
  ];
  const plazoOk = /^\d{1,3}$/.test(plazo) && Number(plazo) <= 365;
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={proveedor ? "Editar proveedor" : "Nuevo proveedor"}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>Cancelar</Button>
          <Button disabled={pendiente || razon.trim().length < 2 || !plazoOk || (!proveedor && !rut.trim())} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : proveedor ? "Guardar" : "Crear proveedor"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="RUT" htmlFor="pv-rut" ayuda={proveedor ? "El RUT no se puede cambiar." : "Con o sin puntos, con guion."}>
          <Input id="pv-rut" className="t-mono" value={rut} disabled={!!proveedor} onChange={(e) => setRut(e.target.value)} autoFocus={!proveedor} />
        </Campo>
        <Campo etiqueta="Razón social" htmlFor="pv-razon">
          <Input id="pv-razon" value={razon} onChange={(e) => setRazon(e.target.value)} />
        </Campo>
        <Campo etiqueta="Correo de contacto" htmlFor="pv-email">
          <Input id="pv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo etiqueta="Plazo de pago (días)" htmlFor="pv-plazo" {...(plazoOk ? {} : { error: "Entre 0 y 365 días." })}>
          <Input id="pv-plazo" inputMode="numeric" value={plazo} onChange={(e) => setPlazo(e.target.value.replace(/\D/g, ""))} />
        </Campo>
        <Campo etiqueta="Cuenta de gasto por defecto" htmlFor="pv-gasto">
          <Select id="pv-gasto" valor={gasto} onCambiar={setGasto} opciones={opcionesCuenta(["gasto", "costo"])} />
        </Campo>
        <Campo etiqueta="Cuenta por pagar por defecto" htmlFor="pv-pagar">
          <Select id="pv-pagar" valor={pagar} onCambiar={setPagar} opciones={opcionesCuenta(["pasivo"])} />
        </Campo>
        <Campo etiqueta="Centro de costo por defecto" htmlFor="pv-centro" ayuda="Se sugiere en sus compras nuevas; nunca se asigna solo.">
          <Select
            id="pv-centro"
            valor={centro}
            onCambiar={setCentro}
            opciones={[{ valor: SIN, etiqueta: "Sin centro por defecto" }, ...p.centros.map((c) => ({ valor: claveCentro(c), etiqueta: c.nombre }))]}
          />
        </Campo>
        <Campo etiqueta="Notas" htmlFor="pv-notas">
          <Textarea id="pv-notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Campo>
        {proveedor ? <Switch etiqueta="Activo" descripcion="Un proveedor inactivo no recibe documentos nuevos; sus compras se conservan." activo={activo} onCambiar={setActivo} /> : null}
      </div>
    </Sheet>
  );
}
