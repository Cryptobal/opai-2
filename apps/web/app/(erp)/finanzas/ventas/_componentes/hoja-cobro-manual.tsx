"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

type Cuenta = { id: string; banco: string; numeroVisible: string; activa: boolean };

/** Registra un cobro hecho fuera de la cartola (efectivo, transferencia no importada); queda deshacible. */
export function HojaCobroManual({
  documentoId,
  pendienteCobro,
  abierta,
  onCerrar,
}: {
  documentoId: string;
  pendienteCobro: number;
  abierta: boolean;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaId, setCuentaId] = useState("");
  const [monto, setMonto] = useState(String(pendienteCobro));
  const [nota, setNota] = useState("");
  const [intento] = useState(() => crypto.randomUUID());
  const n = Number(monto);
  const valido = cuentaId !== "" && Number.isInteger(n) && n > 0 && n <= pendienteCobro;

  useEffect(() => {
    void ejecutar<{ items: Cuenta[] }>("finanzas.bancos.listar", {}, false, "ninguna").then((r) => {
      const activas = (r?.items ?? []).filter((c) => c.activa);
      setCuentas(activas);
      setCuentaId((previa) => previa || activas[0]?.id || "");
    });
  }, [ejecutar]);

  async function registrar() {
    limpiarError();
    const input = { documentoId, monto: n, cuentaId, ...(nota.trim() ? { nota: nota.trim() } : {}) };
    const r = await ejecutar("finanzas.cobros.manual", input, false, "layout", `cobro-${documentoId}-${intento}`);
    if (!r) return;
    avisar.exito("Cobro registrado");
    onCerrar();
  }

  return (
    <Sheet
      abierto={abierta}
      onCerrar={onCerrar}
      titulo="Registrar cobro"
      descripcion={`Pendiente de cobro: ${pesos(pendienteCobro)}. Puedes deshacerlo desde Bancos.`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={pendiente || !valido} onClick={() => void registrar()}>Registrar cobro</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo="No se pudo completar">{error}</Alerta> : null}
        {cuentas.length === 0 ? <Alerta tono="warning" titulo="No hay cuentas bancarias activas">Crea una en Bancos para registrar el cobro.</Alerta> : null}
        <Campo etiqueta="Cuenta donde entró el dinero" htmlFor="cob-cuenta">
          <Select id="cob-cuenta" valor={cuentaId} opciones={cuentas.map((c) => ({ valor: c.id, etiqueta: `${c.banco} · ${c.numeroVisible}` }))} onCambiar={setCuentaId} />
        </Campo>
        <Campo etiqueta="Monto cobrado" htmlFor="cob-monto" ayuda="No puede superar lo pendiente.">
          <Input id="cob-monto" inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))} />
        </Campo>
        <Campo etiqueta="Nota (opcional)" htmlFor="cob-nota">
          <Input id="cob-nota" value={nota} maxLength={300} onChange={(e) => setNota(e.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}
