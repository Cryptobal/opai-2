"use client";

import { useState, useTransition } from "react";

import { Alerta, AuthCard, Button, Monograma } from "@opai/ds";

import { accionAutorizarOAuth } from "@/app/_acciones/oauth";
import { LinkNext } from "@/app/_components/link-next";

import { TEXTO_ALCANCE } from "./alcances";

type Props = { app: string; empresa: string; alcances: string[]; consulta: string };

/** Pantalla de autorizar (export-acceso): qué app, con qué empresa y qué podrá hacer (CAR-247). */
export function Consentimiento({ app, empresa, alcances, consulta }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [fallo, setFallo] = useState(false);
  const responder = (aceptar: boolean) =>
    iniciar(async () => {
      const r = await accionAutorizarOAuth(aceptar, consulta);
      if (r.ok) window.location.assign(r.url);
      else setFallo(true);
    });
  return (
    <AuthCard
      Link={LinkNext}
      insignia={<Monograma nombre={empresa} className="size-10 rounded-md text-sm" />}
      titulo={`Conectar ${app} con OPAI`}
      subtitulo={
        <>
          Entrará como tú en <span className="font-semibold text-fg">{empresa}</span>.
        </>
      }
      acciones={
        <>
          <Button size="lg" block disabled={pendiente} onClick={() => responder(true)}>
            Permitir
          </Button>
          <Button
            variant="ghost"
            size="lg"
            block
            disabled={pendiente}
            onClick={() => responder(false)}
          >
            Cancelar
          </Button>
        </>
      }
    >
      {fallo ? (
        <Alerta tono="danger" titulo="No pudimos completar la autorización" className="mb-4">
          Vuelve a la app y conecta OPAI otra vez.
        </Alerta>
      ) : null}
      <p className="t-label mb-2 text-fg-muted">{app} podrá</p>
      <ul className="flex flex-col gap-3" aria-label="Lo que podrá hacer la app">
        {alcances.map((a) => (
          <li key={a} className="rounded-md border border-border bg-surface p-3">
            <p className="t-body font-semibold text-fg">{TEXTO_ALCANCE[a]?.titulo}</p>
            <p className="t-body-sm text-fg-muted">{TEXTO_ALCANCE[a]?.detalle}</p>
          </li>
        ))}
      </ul>
    </AuthCard>
  );
}
