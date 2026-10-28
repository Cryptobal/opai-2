"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Dialog, Input, Select, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { DESTINATARIO } from "./tipos";

type Props = { casoId: string; estado: string; pendientes: string[]; gestionar: boolean };

/**
 * Acciones de un incidente (`soloPersonas`): pasarlo a evaluación, dejar constancia de un aviso de
 * brecha (queda «notificado» solo cuando constan la Agencia y los titulares) y cerrarlo.
 */
export function AccionesIncidente({ casoId, estado, pendientes, gestionar }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [aviso, setAviso] = useState(false);
  const [destinatario, setDestinatario] = useState(pendientes[0] ?? "");
  const [canal, setCanal] = useState("");
  const [nota, setNota] = useState("");
  if (!gestionar || estado === "cerrado") return null;
  async function avanzar(hacia: "en_evaluacion" | "cerrado") {
    if (await ejecutar("core.cumplimiento.incidente_avanzar", { casoId, estado: hacia }))
      avisar.exito(hacia === "cerrado" ? "Incidente cerrado" : "Incidente en evaluación");
  }
  async function notificar() {
    const r = await ejecutar("core.cumplimiento.incidente_notificar", {
      casoId,
      destinatario,
      ...(canal.trim() ? { canal: canal.trim() } : {}),
      ...(nota.trim() ? { nota: nota.trim() } : {}),
    });
    if (!r) return;
    avisar.exito("Aviso registrado");
    setAviso(false);
  }
  return (
    <div className="flex flex-col gap-3">
      {error && !aviso ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="flex flex-wrap gap-2 [&>*]:min-h-11">
        {estado === "abierto" ? (
          <Button
            variant="secondary"
            disabled={pendiente}
            onClick={() => void avanzar("en_evaluacion")}
          >
            Pasar a evaluación
          </Button>
        ) : null}
        <Button variant="secondary" disabled={pendiente} onClick={() => void avanzar("cerrado")}>
          Cerrar incidente
        </Button>
        {pendientes.length ? (
          <Button onClick={() => setAviso(true)}>Registrar aviso de brecha</Button>
        ) : null}
      </div>
      {aviso ? (
        <Dialog
          abierto
          onCerrar={() => setAviso(false)}
          titulo="Registrar aviso de brecha"
          descripcion="Deja constancia de a quién se avisó y por qué canal. El aviso lo envías tú; aquí queda la prueba."
          acciones={
            <>
              <Button variant="secondary" onClick={() => setAviso(false)}>
                Cancelar
              </Button>
              <Button disabled={pendiente || !destinatario} onClick={() => void notificar()}>
                Registrar aviso
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            {error ? <Alerta tono="danger" titulo={error} /> : null}
            <Campo etiqueta="Aviso a" htmlFor="av-dest">
              <Select
                id="av-dest"
                valor={destinatario}
                onCambiar={setDestinatario}
                opciones={pendientes.map((valor) => ({
                  valor,
                  etiqueta: DESTINATARIO[valor] ?? valor,
                }))}
              />
            </Campo>
            <Campo
              etiqueta="Canal"
              htmlFor="av-canal"
              ayuda="P. ej. «formulario de la Agencia», «correo masivo»"
            >
              <Input id="av-canal" value={canal} onChange={(e) => setCanal(e.target.value)} />
            </Campo>
            <Campo etiqueta="Nota" htmlFor="av-nota" ayuda="Opcional">
              <Textarea
                id="av-nota"
                rows={3}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </Campo>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
