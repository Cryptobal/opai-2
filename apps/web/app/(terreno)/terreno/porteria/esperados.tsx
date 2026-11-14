"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Alerta, Badge, Button } from "@opai/ds";

import { encolarHecho } from "@/lib/terreno/cola";

import { lectorDisponible } from "../_componentes/escanear-qr";

const EscanearQr = dynamic(() => import("../_componentes/escanear-qr").then((m) => m.EscanearQr), {
  ssr: false,
});

export type Esperado = {
  visitanteId: string;
  nombre: string;
  empresa: string | null;
  documento: string;
  desdeMin: number | null;
  hastaMin: number | null;
  anfitrion: string;
  motivo: string | null;
  nota: string | null;
  ingreso: boolean;
};

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const horario = (e: Esperado) =>
  e.desdeMin === null || e.hastaMin === null
    ? "Todo el día"
    : `${hhmm(e.desdeMin)} – ${hhmm(e.hastaMin)}`;
/** Visitante del QR `A1.<kid>.<visitante>.<día>.<firma>`; el servidor verifica la firma al recibir la entrada. */
const visitanteDe = (codigo: string) => codigo.trim().split(".")[2] ?? "";

/** Visitante leído: sus datos ya vienen del prerregistro y el guardia solo confirma (R14). */
function Confirmar(p: { e: Esperado; codigo: string; personaId: string; listo: () => void }) {
  const [estado, setEstado] = useState<"libre" | "guardando" | "error">("libre");
  const registrar = async () => {
    setEstado("guardando");
    try {
      await encolarHecho({
        tipo: "acceso.entrada",
        payload: {
          tipoRegistro: "visita",
          invitacion: p.codigo,
          nombre: p.e.nombre,
          ...(p.e.motivo ? { motivo: p.e.motivo } : {}),
        },
        personaId: p.personaId,
      });
      p.listo();
    } catch {
      setEstado("error");
    }
  };
  return (
    <Alerta tono="success" titulo={`Invitación de ${p.e.nombre}`}>
      <p>
        {[p.e.documento, p.e.empresa, `Anfitrión: ${p.e.anfitrion}`].filter(Boolean).join(" · ")}
      </p>
      {p.e.nota ? <p className="mt-1">Nota: {p.e.nota}</p> : null}
      {estado === "error" ? (
        <p className="mt-1">No se pudo guardar en el teléfono. Reintenta.</p>
      ) : null}
      <Button
        className="mt-2"
        size="lg"
        block
        disabled={estado === "guardando"}
        onClick={() => void registrar()}
      >
        {estado === "guardando" ? "Guardando…" : "Registrar entrada"}
      </Button>
    </Alerta>
  );
}

/** Lista de los esperados de hoy con su horario, anfitrión y si ya entraron. */
function ListaEsperados({ items }: { items: Esperado[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((e) => (
        <li key={e.visitanteId} className="flex items-center justify-between gap-3 py-2">
          <span className="flex min-w-0 flex-col">
            <span className="t-body truncate text-fg">{e.nombre}</span>
            <span className="t-caption">
              {[e.empresa, horario(e), e.anfitrion].filter(Boolean).join(" · ")}
            </span>
          </span>
          <Badge tono={e.ingreso ? "success" : "info"} punto>
            {e.ingreso ? "Ingresó" : "Esperado"}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/**
 * Esperados hoy (CAR-478): los prerregistrados de la instalación y la lectura de su invitación. Al leer el QR el
 * formulario llega lleno y el guardia solo confirma; sin invitación, el documento prerregistrado igual entra.
 */
export function Esperados({
  personaId,
  alRegistrar,
}: {
  personaId: string;
  alRegistrar: () => void;
}) {
  const [items, setItems] = useState<Esperado[] | null>(null);
  const [leido, setLeido] = useState<{ e: Esperado | null; codigo: string } | null>(null);
  useEffect(() => {
    fetch("/api/terreno/porteria/esperados", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: Esperado[] }>) : null))
      .then((x) => setItems(x?.items ?? []))
      .catch(() => setItems([]));
  }, []);
  const leer = (codigo: string) =>
    setLeido({ codigo, e: items?.find((x) => x.visitanteId === visitanteDe(codigo)) ?? null });
  if (!items || items.length === 0) return null;
  return (
    <section aria-label="Esperados hoy" className="flex flex-col gap-3">
      <h2 className="t-heading text-fg">Esperados hoy</h2>
      {lectorDisponible() ? (
        <EscanearQr
          alLeer={leer}
          sinCamara="No se pudo abrir la cámara. Registra con el documento."
        />
      ) : null}
      {leido?.e && !leido.e.ingreso ? (
        <Confirmar
          e={leido.e}
          codigo={leido.codigo}
          personaId={personaId}
          listo={() => {
            const id = leido.e?.visitanteId;
            setItems(
              (xs) => xs?.map((x) => (x.visitanteId === id ? { ...x, ingreso: true } : x)) ?? null,
            );
            setLeido(null);
            alRegistrar();
          }}
        />
      ) : leido ? (
        <Alerta tono="warning" titulo="La invitación no es de hoy o ya se usó">
          Registra la entrada con el documento; la oficina revisará el caso.
        </Alerta>
      ) : null}
      <ListaEsperados items={items} />
    </section>
  );
}
