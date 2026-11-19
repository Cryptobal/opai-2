"use client";

import { useState } from "react";

import { formatearFechaHora } from "@opai/domain";

import { Alerta, Button, Card, CardContent, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Fila } from "./tipos";

export function TarjetaCorreccion({ item, zona }: { item: Fila; zona: string }) {
  const { ejecutar, pendiente } = useCapacidad("trabajador");
  const [objetar, setObjetar] = useState(false);
  const [comentario, setComentario] = useState("");
  const [listo, setListo] = useState<"aceptada" | "objetada" | null>(null);
  const hora = (valor: string) => formatearFechaHora(valor, zona, { fechaLarga: true });
  const legible = (t: { tipo: string; hora: string }) => `${t.tipo} · ${hora(t.hora)}`;

  async function responder(resultado: "aceptada" | "objetada") {
    const r = await ejecutar("asistencia.correcciones.responder", {
      correccionId: item.correccionId,
      resultado,
      ...(resultado === "objetada" ? { comentario } : {}),
    });
    if (r) setListo(resultado);
  }

  if (listo) return <Alerta tono="success" titulo={listo === "aceptada" ? "Aceptaste la corrección" : "Objetaste la corrección"} />;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <p className="text-base text-fg-muted">Original: {legible(item.original)}</p>
        <p className="t-title text-fg">Propuesta: {legible(item.propuesta)}</p>
        <p className="text-base text-fg">{item.motivo}</p>
        {item.venceEn ? <p className="t-caption text-fg-muted">Responde antes del {hora(item.venceEn)}</p> : null}
        {objetar ? (
          <>
            <Textarea rows={3} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} />
            <Button size="lg" block variant="destructive" disabled={pendiente || comentario.trim().length < 3} onClick={() => void responder("objetada")}>
              Enviar objeción
            </Button>
            <Button size="lg" block variant="ghost" onClick={() => setObjetar(false)}>Volver</Button>
          </>
        ) : (
          <>
            <Button size="lg" block disabled={pendiente} onClick={() => void responder("aceptada")}>Acepto la corrección</Button>
            <Button size="lg" block variant="secondary" onClick={() => setObjetar(true)}>No estoy de acuerdo</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}