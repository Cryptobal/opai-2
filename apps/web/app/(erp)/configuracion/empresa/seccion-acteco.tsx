"use client";

import { X } from "lucide-react";
import { useCallback, useState } from "react";

import { Badge, Button, Campo, Combobox, Input, SeccionTarjeta } from "@opai/ds";
import { formatearActeco, leerActeco } from "@opai/domain";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import type { ActecoElegido, EstadoActecos } from "./use-actecos";

type Item = { codigo: number; codigoSii: string; glosa: string };

/** Busca en el catálogo del SII en el servidor (`core.empresa.acteco_buscar`): las glosas no viajan al navegador. */
async function buscar(q: string, limite = 20): Promise<Item[]> {
  const r = await ejecutarCapacidad("erp", "core.empresa.acteco_buscar", { q, limite }, false, "ninguna");
  return r.ok ? (r.data as { items: Item[] }).items : [];
}

/** Actividad económica de la empresa ante el SII (CAR-243): catálogo buscable, código a mano y uno principal. */
export function SeccionActeco({ ac, dis }: { ac: EstadoActecos; dis: boolean }) {
  // Todas las opciones vistas, acumuladas: una respuesta de búsqueda atrasada no hace perder la que se eligió.
  const [vistos, setVistos] = useState<ReadonlyMap<number, Item>>(new Map());
  const [manual, setManual] = useState("");
  const [errorManual, setErrorManual] = useState<string | undefined>();
  const onBuscar = useCallback(async (q: string) => {
    const items = await buscar(q);
    setVistos((m) => new Map([...m, ...items.map((i) => [i.codigo, i] as const)]));
    return items.map((i) => ({ valor: String(i.codigo), etiqueta: `${i.codigoSii} · ${i.glosa}` }));
  }, []);
  async function agregarManual() {
    const codigo = leerActeco(manual);
    if (codigo === null) return setErrorManual("Escribe el código de 6 dígitos del SII.");
    setErrorManual(undefined);
    const delCatalogo = (await buscar(formatearActeco(codigo), 1)).find((i) => i.codigo === codigo);
    ac.agregar({ codigo, codigoSii: formatearActeco(codigo), glosa: delCatalogo?.glosa ?? null });
    setManual("");
  }
  return (
    <SeccionTarjeta titulo="Actividad económica (SII)">
      <div className="flex flex-col gap-4">
        <p className="t-body text-fg-muted">
          Los códigos ACTECO de tu empresa. El principal va en cada factura: sin él, el SII la rechaza.
        </p>
        {ac.lista.length === 0 ? (
          <p className="t-body text-fg-subtle">Aún no hay actividades económicas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {ac.lista.map((a) => (
              <FilaActeco key={a.codigo} a={a} principal={ac.principal === a.codigo} dis={dis} ac={ac} />
            ))}
          </ul>
        )}
        {dis ? null : (
          <div className="grid gap-4 md:grid-cols-2">
            <Campo etiqueta="Buscar en el catálogo del SII" htmlFor="e-acteco">
              <Combobox
                id="e-acteco"
                valor={null}
                opciones={[...vistos.values()].map((i) => ({ valor: String(i.codigo), etiqueta: `${i.codigoSii} · ${i.glosa}` }))}
                onBuscar={onBuscar}
                onCambiar={([v]) => {
                  const i = vistos.get(Number(v));
                  if (i) ac.agregar(i);
                }}
                placeholder="Código o actividad (p. ej. seguridad privada)"
                buscarPlaceholder="Escribe un código o palabras"
                textoInicial="Escribe un código o una actividad"
              />
            </Campo>
            <Campo etiqueta="¿No está en la lista? Escribe el código" htmlFor="e-acteco-manual" error={errorManual}>
              <div className="flex gap-2">
                <Input
                  id="e-acteco-manual"
                  inputMode="numeric"
                  className="t-mono"
                  value={manual}
                  placeholder="801001"
                  aria-invalid={errorManual ? true : undefined}
                  onChange={(e) => setManual(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    void agregarManual();
                  }}
                />
                <Button type="button" variant="secondary" onClick={() => void agregarManual()}>
                  Agregar
                </Button>
              </div>
            </Campo>
          </div>
        )}
      </div>
    </SeccionTarjeta>
  );
}

function FilaActeco(p: { a: ActecoElegido; principal: boolean; dis: boolean; ac: EstadoActecos }) {
  const { a, principal, dis, ac } = p;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <span className="t-mono text-fg">{a.codigoSii}</span>
      <span className="t-body min-w-0 flex-1 text-fg">{a.glosa ?? "Código fuera del catálogo del SII"}</span>
      {principal ? <Badge tono="accent">Principal</Badge> : null}
      {dis ? null : (
        <span className="flex items-center gap-1">
          {principal ? null : (
            <Button
              type="button"
              variant="ghost"
              aria-label={`Hacer principal el ${a.codigoSii}`}
              onClick={() => ac.marcarPrincipal(a.codigo)}
            >
              Hacer principal
            </Button>
          )}
          <Button type="button" variant="ghost" size="iconSm" aria-label={`Quitar ${a.codigoSii}`} onClick={() => ac.quitar(a.codigo)}>
            <X className="size-4" aria-hidden />
          </Button>
        </span>
      )}
    </li>
  );
}
