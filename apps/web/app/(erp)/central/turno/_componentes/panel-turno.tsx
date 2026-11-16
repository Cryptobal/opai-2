"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Campo, Select, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { TurnoEstado } from "../../_componentes/tipos-central";

type Usuario = { userId: string; nombre: string };

type Props = {
  turno: TurnoEstado;
  operador: string | null;
  entregaPara: string | null;
  usuarios: Usuario[];
  gobernar: boolean;
  atender: boolean;
  respaldoId: string;
};

export function PanelTurno({ turno, operador, entregaPara, usuarios, gobernar, atender, respaldoId }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [entregaA, setEntregaA] = useState("");
  const [notaEntrega, setNotaEntrega] = useState("");

  async function run(llamada: Promise<unknown>, ok: string) {
    if (await llamada) {
      avisar.exito(ok);
      router.refresh();
    }
  }

  const t = turno.turno;
  const yoOpero = t && operador && t.operadorId === operador && t.estado === "abierto";
  const entregaAMi = t && entregaPara && t.entregaAId === entregaPara && t.estado === "en_entrega";

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      {atender ? (
        <div className="flex flex-wrap gap-2">
          {!t ? (
            <Button variant="primary" disabled={pendiente} onClick={() => run(ejecutar("central.turno.abrir", {}), "Turno abierto")}>
              Abrir turno
            </Button>
          ) : null}
          {yoOpero ? (
            <>
              <Button variant="secondary" disabled={pendiente} onClick={() => run(ejecutar("central.turno.cerrar", {}), "Turno cerrado")}>
                Cerrar turno
              </Button>
            </>
          ) : null}
          {entregaAMi ? (
            <Button variant="primary" disabled={pendiente} onClick={() => run(ejecutar("central.turno.aceptar", {}), "Turno aceptado")}>
              Aceptar turno
            </Button>
          ) : null}
        </div>
      ) : null}

      {yoOpero ? (
        <section className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <h3 className="t-label text-fg">Entregar turno</h3>
          <Select
            valor={entregaA}
            onCambiar={setEntregaA}
            opciones={[{ valor: "", etiqueta: "Elegir persona" }, ...usuarios.map((u) => ({ valor: u.userId, etiqueta: u.nombre }))]}
          />
          <Campo etiqueta="Nota de entrega">
            <Textarea value={notaEntrega} onChange={(e) => setNotaEntrega(e.target.value)} rows={3} />
          </Campo>
          <Button
            variant="secondary"
            disabled={pendiente || !entregaA}
            onClick={() =>
              run(
                ejecutar("central.turno.entregar", { aUsuarioId: entregaA, nota: notaEntrega }),
                "Turno entregado",
              )
            }
          >
            Entregar turno
          </Button>
        </section>
      ) : null}

      {atender || gobernar ? (
        <section className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <h3 className="t-label text-fg">Agente de central</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={pendiente} onClick={() => run(ejecutar("central.agente.pausar", { instalacionId: null }), "Agente en pausa")}>
              Pausar en toda la empresa
            </Button>
            {gobernar && turno.pausadaEmpresa ? (
              <Button variant="primary" disabled={pendiente} onClick={() => run(ejecutar("central.agente.reanudar", { instalacionId: null }), "Agente reanudado")}>
                Reanudar en toda la empresa
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <p className="t-caption text-fg-muted">
        El responsable de respaldo se define en Configuración → Central
        {respaldoId ? ` (actual: ${usuarios.find((u) => u.userId === respaldoId)?.nombre ?? "persona asignada"})` : ""}.
      </p>
    </div>
  );
}