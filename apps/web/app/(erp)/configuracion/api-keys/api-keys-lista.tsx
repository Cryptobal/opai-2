"use client";

import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";

import { Badge, Button, Dialog, type EstadoPantalla, ListScreen } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaHora } from "@/lib/formato";

import { CrearApiKey } from "./crear-api-key";

export type ApiKey = {
  id: string;
  nombre: string;
  prefijo: string;
  scopes: string[];
  responsable: { nombre: string; email: string };
  ultimoUsoEn: string | null;
  revocadaEn: string | null;
  valida: boolean;
};

const estado = (k: ApiKey) =>
  k.revocadaEn ? (
    <Badge tono="neutro">Revocada</Badge>
  ) : k.valida ? (
    <Badge tono="success">Válida</Badge>
  ) : (
    <Badge tono="danger">Inválida</Badge>
  );
const scopes = (k: ApiKey) => (k.scopes.includes("*") ? "Todos los módulos" : k.scopes.join(", "));

type Props = { state: EstadoPantalla; keys: ApiKey[]; scopesDisponibles: string[] };

/** Configuración → API keys para agentes (Grokbot, Claude): crear, ver uso, revocar. */
export function ApiKeysLista({ state, keys, scopesDisponibles }: Props) {
  const [crear, setCrear] = useState(false);
  const [revocar, setRevocar] = useState<ApiKey | null>(null);
  const { ejecutar, error } = useCapacidad("erp");

  async function confirmarRevocar() {
    if (revocar) await ejecutar("core.apikeys.revoke", { apiKeyId: revocar.id });
    setRevocar(null);
  }

  return (
    <>
      {error ? <p className="mb-3 text-sm font-medium text-danger-fg">{error}</p> : null}
      <ListScreen
        state={state}
        titulo="API keys"
        subtitulo="Para agentes por MCP o API. Cada key actúa con los permisos de quien la creó."
        accionPrincipal={
          <Button onClick={() => setCrear(true)}>
            <Plus className="size-4" /> Crear API key
          </Button>
        }
        textos={{
          vacio: {
            titulo: "Aún no hay API keys",
            descripcion: "Crea una para conectar un agente.",
          },
        }}
        items={keys}
        clave={(k) => k.id}
        onSeleccionar={(k) => !k.revocadaEn && setRevocar(k)}
        tarjeta={(k) => (
          <>
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-fill">
              <KeyRound className="size-4 text-fg-muted" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-md font-medium text-fg">{k.nombre}</span>
              <span className="t-mono block truncate text-sm text-fg-muted">{k.prefijo}…</span>
              <span className="t-caption block">Último uso {fechaHora(k.ultimoUsoEn)}</span>
            </span>
            {estado(k)}
          </>
        )}
        columnas={[
          {
            id: "nombre",
            etiqueta: "Nombre",
            render: (k) => <span className="font-medium">{k.nombre}</span>,
          },
          {
            id: "prefijo",
            etiqueta: "Prefijo",
            render: (k) => <span className="t-mono">{k.prefijo}…</span>,
          },
          { id: "scopes", etiqueta: "Scopes", render: scopes },
          { id: "responsable", etiqueta: "Responsable", render: (k) => k.responsable.nombre },
          { id: "uso", etiqueta: "Último uso", render: (k) => fechaHora(k.ultimoUsoEn) },
          { id: "estado", etiqueta: "Estado", render: estado },
        ]}
      />
      <CrearApiKey
        abierto={crear}
        onCerrar={() => setCrear(false)}
        scopesDisponibles={scopesDisponibles}
      />
      <Dialog
        abierto={revocar !== null}
        onCerrar={() => setRevocar(null)}
        titulo={`¿Revocar la key ${revocar?.nombre ?? ""}?`}
        descripcion="Deja de funcionar de inmediato para todo agente que la use. No se puede deshacer."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setRevocar(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarRevocar}>
              Revocar
            </Button>
          </>
        }
      />
    </>
  );
}
