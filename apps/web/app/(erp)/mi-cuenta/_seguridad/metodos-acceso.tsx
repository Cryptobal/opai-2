"use client";

import { KeyRound, Smartphone } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Badge, Button, estilosBoton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import type { Quitar } from "@/app/_acciones/metodos-acceso";

import { AgregarPasskey } from "./agregar-passkey";
import type { Metodos } from "./tipos";

// Diálogos diferidos: solo se descargan al abrirlos (presupuesto de JS, ADR-037).
const QuitarMetodo = dynamic(() => import("./quitar-metodo").then((m) => m.QuitarMetodo));
const RenombrarPasskey = dynamic(() =>
  import("./renombrar-passkey").then((m) => m.RenombrarPasskey),
);

type Accion =
  | { tipo: "quitar"; quitar: Quitar; etiqueta: string }
  | { tipo: "renombrar"; id: string; nombre: string }
  | null;

/** Mi cuenta › Seguridad (CAR-286): passkeys y app autenticadora, cada una opcional. */
export function MetodosAcceso({ m }: { m: Metodos }) {
  const [accion, setAccion] = useState<Accion>(null);
  const cerrar = () => setAccion(null);
  return (
    <>
      <section aria-labelledby="t-passkeys" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="t-passkeys" className="t-label text-fg">
            Passkeys
          </h3>
          <p className="text-sm text-fg-muted">
            Entra con Face ID, huella o una llave de seguridad, sin escribir códigos.
          </p>
        </div>
        {m.passkeys.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {m.passkeys.map((p) => {
              const nombre = p.nombre || "Passkey";
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                  <KeyRound aria-hidden className="size-5 flex-none text-fg-muted" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base text-fg">{nombre}</span>
                    <span className="text-sm text-fg-muted">
                      Agregada el {p.creadaEnTexto ?? "—"}
                    </span>
                  </div>
                  <Badge tono={p.sincronizada ? "info" : "neutro"}>
                    {p.sincronizada ? "Sincronizada" : "Solo este dispositivo"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => setAccion({ tipo: "renombrar", id: p.id, nombre })}
                    >
                      Renombrar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setAccion({
                          tipo: "quitar",
                          quitar: { metodo: "passkey", id: p.id },
                          etiqueta: `«${nombre}»`,
                        })
                      }
                    >
                      Quitar
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Aún no tienes passkeys.</p>
        )}
        <div>
          <AgregarPasskey primera={m.passkeys.length === 0} />
        </div>
      </section>
      <section aria-labelledby="t-app" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="t-app" className="t-label text-fg">
            App autenticadora
          </h3>
          <p className="text-sm text-fg-muted">
            Un código de 6 dígitos de Google Authenticator, 1Password u otra app, con códigos de
            respaldo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3">
          <Smartphone aria-hidden className="size-5 flex-none text-fg-muted" />
          <span className="min-w-0 flex-1 text-base text-fg">
            {m.appAutenticadora ? "Activa" : "No activada"}
          </span>
          {m.appAutenticadora ? (
            <Button
              variant="ghost"
              onClick={() =>
                setAccion({
                  tipo: "quitar",
                  quitar: { metodo: "app_autenticadora" },
                  etiqueta: "la app autenticadora",
                })
              }
            >
              Desactivar
            </Button>
          ) : (
            <LinkNext
              href="/activar-mfa?next=/mi-cuenta"
              className={estilosBoton({ variant: "secondary" })}
            >
              Activar
            </LinkNext>
          )}
        </div>
      </section>
      {accion?.tipo === "quitar" ? (
        <QuitarMetodo quitar={accion.quitar} etiqueta={accion.etiqueta} m={m} onCerrar={cerrar} />
      ) : null}
      {accion?.tipo === "renombrar" ? (
        <RenombrarPasskey id={accion.id} actual={accion.nombre} onCerrar={cerrar} />
      ) : null}
    </>
  );
}
