"use client";

import { useActionState, useEffect } from "react";

import { Alerta, AuthCard, Button, Campo, Input } from "@opai/ds";

import { accionEmparejar, type EstadoEmparejar } from "@/app/_acciones/dispositivos";
import { LinkNext } from "@/app/_components/link-next";

type Props = {
  estado: "codigo" | "listo" | "revocado";
  identificador: string | null;
  codigoInicial: string;
};

/** Pantallas de Emparejar según el diseño aprobado: código, dispositivo emparejado y «ya no está emparejado». */
export function PantallaEmparejar({ estado, identificador, codigoInicial }: Props) {
  const [r, emparejar, pendiente] = useActionState(accionEmparejar, {
    tipo: "inicial",
  } as EstadoEmparejar);
  // Un equipo revocado borra los datos locales de la instalación (cola y cachés llegan con B3).
  useEffect(() => {
    if (estado !== "revocado") return;
    try {
      localStorage.clear();
      sessionStorage.clear();
      void caches?.keys().then((ks) => ks.forEach((k) => void caches.delete(k)));
    } catch {
      /* sin almacenamiento: nada que borrar */
    }
  }, [estado]);

  if (estado === "listo") {
    return (
      <AuthCard
        sufijo="Terreno"
        titulo="Dispositivo emparejado"
        Link={LinkNext}
        acciones={
          <LinkNext
            href="/terreno"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-accent px-4 text-accent-fg"
          >
            Continuar
          </LinkNext>
        }
      >
        <p className="text-base text-fg-muted">
          Desde ahora abre Terreno de esta instalación. Cada guardia elige su nombre al empezar.
        </p>
        <p className="t-mono mt-3 text-fg">Identificador {identificador}</p>
        <p className="mt-3 text-sm text-fg-muted">
          Si el dispositivo se pierde, el administrador lo revoca desde el ERP y deja de mostrar
          datos al instante.
        </p>
      </AuthCard>
    );
  }
  if (estado === "revocado") {
    return (
      <AuthCard sufijo="Terreno" titulo="Este dispositivo ya no está emparejado" Link={LinkNext}>
        <Alerta tono="warning" titulo="Borramos los datos de la instalación.">
          Si fue un error, pide un código nuevo en el ERP y empareja de nuevo este equipo.
        </Alerta>
        <LinkNext
          href="/terreno/emparejar?c="
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-control px-4 text-fg"
        >
          Emparejar de nuevo
        </LinkNext>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      sufijo="Terreno"
      titulo="Emparejar este dispositivo"
      subtitulo="En el ERP, abre la instalación → Dispositivos → «Emparejar dispositivo». Escribe el código de 6 caracteres o escanea el QR."
      Link={LinkNext}
    >
      {r.tipo === "error" ? <Alerta key={r.n} tono="danger" titulo={r.texto} /> : null}
      <form action={emparejar} className="flex flex-col gap-4">
        <Campo etiqueta="Código" htmlFor="codigo">
          <Input
            id="codigo"
            name="codigo"
            defaultValue={codigoInicial}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={7}
            placeholder="ABC123"
            className="t-mono text-center text-xl tracking-widest uppercase"
            disabled={pendiente}
            required
          />
        </Campo>
        <p className="text-sm text-fg-muted">El código vence 10 minutos después de generarlo.</p>
        <Button type="submit" size="lg" block disabled={pendiente}>
          {pendiente ? "Emparejando…" : "Emparejar"}
        </Button>
      </form>
    </AuthCard>
  );
}
