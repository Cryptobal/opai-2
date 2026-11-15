"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Campo, Dialog, Input, Menu, type ItemMenu } from "@opai/ds";

import { filtrosDeUrl, useVistas } from "./use-vistas";

const MAXIMO = 10;

/**
 * «Vistas» de una lista (CAR-335 D4c): filtros con nombre, de cada persona. Elegir una aplica sus
 * filtros; «Guardar esta vista» guarda los de la URL actual.
 */
export function VistasGuardadas({ lista, ruta }: { lista: string; ruta: string }) {
  const router = useRouter();
  const { vistas, error, cargar, guardar } = useVistas("erp", lista);
  const [dialogo, setDialogo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const preparar = () => void (vistas === null && cargar());
  const fallo = error !== null && !dialogo;
  const lleno = (vistas?.length ?? 0) >= MAXIMO;
  const items: ItemMenu[] = [
    ...(vistas ?? []).map((v, i) => ({
      id: `ver-${i}`,
      etiqueta: v.nombre,
      ...(i === 0 ? { grupo: "Tus vistas" } : {}),
      onSelect: () => router.push(`${ruta}${v.query}`),
    })),
    ...(fallo ? [{ id: "error", etiqueta: error ?? "", deshabilitado: true, onSelect: () => {} }] : []),
    {
      id: "guardar",
      etiqueta: lleno ? `Máximo ${MAXIMO} vistas` : "Guardar esta vista…",
      separador: Boolean(vistas?.length),
      deshabilitado: vistas === null || lleno,
      onSelect: () => setDialogo(true),
    },
    ...(vistas ?? []).map((v, i) => ({
      id: `quitar-${i}`,
      etiqueta: `Quitar «${v.nombre}»`,
      peligro: true,
      ...(i === 0 ? { grupo: "Quitar", separador: true } : {}),
      onSelect: () =>
        void guardar((vistas ?? []).filter((x) => x !== v)).then(
          (ok) =>
            ok ? avisar.exito(`Vista «${v.nombre}» quitada`) : avisar.error("No se pudo quitar la vista"),
        ),
    })),
  ];
  async function confirmar() {
    const n = nombre.trim();
    if (!n || !vistas) return;
    setGuardando(true);
    const otras = vistas.filter((v) => v.nombre !== n);
    const ok = await guardar([...otras, { nombre: n, query: filtrosDeUrl(location.search) }]);
    setGuardando(false);
    if (!ok) return;
    avisar.exito(`Vista «${n}» guardada`);
    setDialogo(false);
    setNombre("");
  }
  return (
    <span onPointerEnter={preparar} onFocus={preparar}>
      <Menu
        etiqueta="Vistas guardadas"
        disparador={
          <span className="flex items-center gap-1.5 px-3 text-sm text-fg">
            <Bookmark className="size-4" aria-hidden />
            Vistas
          </span>
        }
        items={items}
        lado="abajo-izquierda"
        claseDisparador="min-h-11 rounded-full border border-border bg-surface md:min-h-8"
      />
      <Dialog
        abierto={dialogo}
        onCerrar={() => !guardando && setDialogo(false)}
        titulo="Guardar esta vista"
        descripcion="Guarda los filtros y la búsqueda actuales con un nombre. Solo tú la ves."
        acciones={
          <>
            <Button variant="secondary" disabled={guardando} onClick={() => setDialogo(false)}>
              Cancelar
            </Button>
            <Button disabled={guardando || !nombre.trim()} onClick={() => void confirmar()}>
              {guardando ? "Guardando…" : "Guardar vista"}
            </Button>
          </>
        }
      >
        {error ? <p className="t-caption text-danger-fg">{error}</p> : null}
        <Campo etiqueta="Nombre" htmlFor="vista-nombre">
          <Input
            id="vista-nombre"
            value={nombre}
            maxLength={40}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Por ejemplo: Clientes activos"
          />
        </Campo>
      </Dialog>
    </span>
  );
}
