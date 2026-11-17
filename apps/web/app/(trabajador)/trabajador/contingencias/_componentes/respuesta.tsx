"use client";

import { useState } from "react";

import { Alerta, Button, Card, CardContent, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Fila } from "./tipos";

export function TarjetaRespuesta({ item, zona }: { item: Fila; zona: string }) {
  const { ejecutar, pendiente } = useCapacidad("trabajador");
  const [objetar, setObjetar] = useState(false);
  const [comentario, setComentario] = useState("");
  const [listo, setListo] = useState<"aceptada" | "rechazada" | null>(null);
  const hora = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: zona, hourCycle: "h23" });

  async function responder(decision: "aceptada" | "rechazada") {
    const r = await ejecutar("asistencia.contingencias.responder", {
      contingenciaId: item.id,
      decision,
      ...(decision === "rechazada" ? { comentario } : {}),
    });
    if (r) setListo(decision);
  }

  if (listo) return <Alerta tono="success" titulo={listo === "aceptada" ? "Aceptaste la marca" : "Objetaste la marca"} />;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <p className="t-title text-fg">{item.tipoEtiqueta}</p>
        <p className="text-base text-fg-muted">{hora.format(new Date(item.horaDeclarada))} · {item.instalacionNombre}</p>
        <p className="text-base text-fg">{item.motivo}</p>
        {objetar ? (
          <>
            <Textarea rows={3} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Por qué no estás de acuerdo" />
            <Button size="lg" block variant="destructive" disabled={pendiente || comentario.trim().length < 3} onClick={() => void responder("rechazada")}>
              Enviar objeción
            </Button>
            <Button size="lg" block variant="ghost" onClick={() => setObjetar(false)}>Volver</Button>
          </>
        ) : (
          <>
            <Button size="lg" block disabled={pendiente} onClick={() => void responder("aceptada")}>Acepto la marca</Button>
            <Button size="lg" block variant="secondary" onClick={() => setObjetar(true)}>No estoy de acuerdo</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}