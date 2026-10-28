"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useHojaUrl } from "../maestros/use-url";
import { useCapacidad } from "../use-capacidad";

const TIPOS = [
  { valor: "acceso", etiqueta: "Acceso", descripcion: "Saber qué datos suyos tratamos" },
  { valor: "rectificacion", etiqueta: "Rectificación", descripcion: "Corregir un dato inexacto" },
  { valor: "cancelacion", etiqueta: "Cancelación", descripcion: "Suprimir o anonimizar sus datos" },
  { valor: "oposicion", etiqueta: "Oposición", descripcion: "Que no se traten para un fin" },
  {
    valor: "portabilidad",
    etiqueta: "Portabilidad",
    descripcion: "Recibirlos en formato legible por máquina",
  },
  { valor: "bloqueo", etiqueta: "Bloqueo", descripcion: "Suspender temporalmente su tratamiento" },
] as const;

export type TitularFicha = { tipo: "persona" | "contacto"; id: string; nombre: string };

/**
 * Registrar una solicitud del titular (ARCO+, `?solicitud=1`). Desde la ficha llega con el titular
 * interno; desde la bandeja se registra con su correo (§10: puede llegar por correo o papel).
 */
export function HojaSolicitud({ titular }: { titular?: TitularFicha }) {
  const hoja = useHojaUrl("solicitud");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [tipo, setTipo] = useState<string>("acceso");
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [nota, setNota] = useState("");
  const correoMalo = !titular && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
  async function registrar() {
    const r = await ejecutar("core.cumplimiento.solicitud_crear", {
      tipo,
      ...(titular
        ? { titular: { tipo: titular.tipo, id: titular.id } }
        : {
            titularEmail: correo.trim(),
            ...(nombre.trim() ? { titularNombre: nombre.trim() } : {}),
          }),
      ...(nota.trim() ? { nota: nota.trim() } : {}),
    });
    if (!r) return;
    avisar.exito("Solicitud registrada");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Nueva solicitud del titular"
      {...(titular ? { descripcion: `Titular: ${titular.nombre}` } : {})}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || correoMalo} onClick={() => void registrar()}>
            {pendiente ? "Registrando…" : "Registrar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Derecho que ejerce" htmlFor="sol-tipo">
          <Select id="sol-tipo" valor={tipo} onCambiar={setTipo} opciones={TIPOS} />
        </Campo>
        {titular ? null : (
          <>
            <Campo etiqueta="Correo del titular" htmlFor="sol-correo">
              <Input
                id="sol-correo"
                type="email"
                inputMode="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Nombre" htmlFor="sol-nombre" ayuda="Opcional">
              <Input id="sol-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Campo>
          </>
        )}
        <Campo
          etiqueta="Nota"
          htmlFor="sol-nota"
          ayuda="Cómo llegó y qué pide, sin copiar datos sensibles"
        >
          <Textarea id="sol-nota" rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}
