"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Select, Sheet, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { PORTALES } from "./portales";

/** Preferencia personal, en la hoja existente del DS V2; no crea una pantalla nueva. */
export function PortalInicio({ portal, onCerrar }: { portal: string; onCerrar: () => void }) {
  const [datos, setDatos] = useState<{ portales: string[]; portalInicio: string | null } | null>(
    null,
  );
  const [valor, setValor] = useState("auto");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let activo = true;
    void ejecutarCapacidad(portal, "core.me", {})
      .then((r) => {
        if (!activo) return;
        if (!r.ok) {
          setError(r.error.message);
          return;
        }
        const d = r.data as { portales: string[]; portalInicio: string | null };
        setDatos(d);
        setValor(d.portalInicio && d.portales.includes(d.portalInicio) ? d.portalInicio : "auto");
      })
      .catch(() => {
        if (activo) setError("Revisa tu conexión y vuelve a intentarlo.");
      });
    return () => {
      activo = false;
    };
  }, [portal, intento]);
  const inicial =
    datos?.portalInicio && datos.portales.includes(datos.portalInicio)
      ? datos.portalInicio
      : "auto";
  async function guardar() {
    setGuardando(true);
    setError("");
    const r = await ejecutarCapacidad(portal, "core.me.portal_inicio", {
      portal: valor === "auto" ? null : valor,
    });
    setGuardando(false);
    if (!r.ok) setError(r.error.message);
    else {
      avisar.exito("Portal de inicio guardado. Lo usaremos la próxima vez que entres.");
      onCerrar();
    }
  }
  return (
    <Sheet abierto onCerrar={onCerrar} titulo="Portal de inicio">
      {error ? (
        <Alerta
          tono="danger"
          titulo={datos ? "No pudimos guardar" : "No pudimos cargar tus portales"}
        >
          {error}
          {!datos ? (
            <Button
              variant="ghost"
              onClick={() => {
                setError("");
                setIntento((n) => n + 1);
              }}
            >
              Reintentar
            </Button>
          ) : null}
        </Alerta>
      ) : null}
      {!datos && !error ? <Skeleton className="h-11 w-full" /> : null}
      <div className="flex flex-col gap-4">
        <Campo
          etiqueta="Portal de inicio"
          htmlFor="portal-inicio"
          ayuda="Al entrar o cambiar de empresa, iremos a este portal."
        >
          <Select
            id="portal-inicio"
            valor={valor}
            onCambiar={setValor}
            disabled={!datos || guardando}
            opciones={[
              { valor: "auto", etiqueta: "Primero permitido" },
              ...PORTALES.filter((p) => p.id !== "platform" && datos?.portales.includes(p.id)).map(
                (p) => ({ valor: p.id, etiqueta: p.etiqueta }),
              ),
            ]}
          />
        </Campo>
        <Button onClick={() => void guardar()} disabled={!datos || guardando || valor === inicial}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </Sheet>
  );
}
