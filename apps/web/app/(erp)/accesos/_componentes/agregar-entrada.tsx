"use client";

import { useState } from "react";

import { avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { BORRADOR_VACIO, type Borrador, CamposEntrada } from "./campos-entrada";

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Entrada de la capacidad `acceso.listas.agregar` a partir del borrador de la hoja. */
function entradaDe(instalacionId: string, tipo: "autorizada" | "bloqueada", b: Borrador) {
  const horario = tipo === "autorizada" && b.desde && b.hastaHora;
  return {
    instalacionId,
    tipo,
    documento: {
      tipo: b.docTipo,
      numero: b.numero.trim(),
      ...(b.docTipo !== "run" && b.pais ? { pais: b.pais } : {}),
    },
    ...(b.nombre.trim().length >= 2 ? { nombre: b.nombre.trim() } : {}),
    ...(tipo === "bloqueada" ? { motivo: b.motivo.trim() } : {}),
    tiposRegistro: b.tipos,
    // Fin del día elegido en la hora del navegador (la vigencia es un instante; la portería la cruza en su zona).
    ...(b.hasta ? { vigenteHasta: new Date(`${b.hasta}T23:59:59`).toISOString() } : {}),
    ...(tipo === "autorizada" ? { dias: b.dias, usoUnico: b.usoUnico } : {}),
    ...(horario ? { desdeMin: minutos(b.desde), hastaMin: minutos(b.hastaHora) } : {}),
  };
}

/** Qué falta para poder guardar (o null): se dice en la hoja en vez de descartar datos en silencio. */
function avisoBorrador(b: Borrador, bloqueada: boolean): string | null {
  if (!b.numero.trim()) return "Escribe el número del documento.";
  if (b.docTipo !== "run" && b.pais.trim().length < 2) return "Indica el país del documento.";
  if (bloqueada && b.motivo.trim().length < 3) return "El bloqueo necesita un motivo.";
  if (!bloqueada && Boolean(b.desde) !== Boolean(b.hastaHora))
    return "El horario necesita desde y hasta.";
  if (!bloqueada && b.desde && b.desde >= b.hastaHora)
    return "El horario debe terminar después de empezar (un horario que cruza la medianoche aún no se admite).";
  return null;
}

/** «Agregar» de la lista (diseño `Listas`): hoja a la derecha, abajo en teléfono. */
export function AgregarEntrada({
  instalacionId,
  tipo,
}: {
  instalacionId: string;
  tipo: "autorizada" | "bloqueada";
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  const [b, setB] = useState<Borrador>(BORRADOR_VACIO);
  const bloqueada = tipo === "bloqueada";
  const aviso = avisoBorrador(b, bloqueada);
  const valido = aviso === null;

  async function guardar() {
    const r = await ejecutar("acceso.listas.agregar", entradaDe(instalacionId, tipo, b));
    if (!r) return;
    avisar.exito(bloqueada ? "Agregado a bloqueados" : "Agregado a autorizados");
    setB(BORRADOR_VACIO);
    setAbierto(false);
  }

  return (
    <>
      <Button onClick={() => setAbierto(true)}>Agregar</Button>
      <Sheet
        abierto={abierto}
        onCerrar={() => {
          limpiarError();
          setAbierto(false);
        }}
        titulo={bloqueada ? "Agregar a bloqueados" : "Agregar a autorizados"}
        acciones={
          <Button
            block
            size="lg"
            variant={bloqueada ? "destructive" : "primary"}
            disabled={pendiente || !valido}
            onClick={() => void guardar()}
          >
            {pendiente ? "Guardando…" : bloqueada ? "Bloquear" : "Agregar"}
          </Button>
        }
      >
        {error ? <p className="t-caption mb-3 text-danger-fg">{error}</p> : null}
        {aviso && b.numero.trim() ? <p className="t-caption mb-3 text-fg-muted">{aviso}</p> : null}
        <CamposEntrada b={b} set={setB} bloqueada={bloqueada} />
      </Sheet>
    </>
  );
}
