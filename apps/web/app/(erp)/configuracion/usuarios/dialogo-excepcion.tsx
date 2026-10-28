"use client";

import { useState } from "react";

import { avisar, Button, Campo, Combobox, Dialog, Segmentado, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type ModuloCatalogo, nombreModulo, nombrePermiso } from "./_permisos/etiquetas";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  membershipId: string;
  catalogo: readonly ModuloCatalogo[];
  concedibles: readonly string[];
  /** Tras guardar: recarga la lista de excepciones. */
  onGuardada: () => void;
};

/**
 * Agregar excepción (A4 §3): permiso del catálogo agrupado por módulo, Conceder | Denegar y motivo
 * obligatorio (200). Conceder solo ofrece lo que el usuario actual tiene (nadie concede de más).
 */
export function DialogoExcepcion(p: Props) {
  const { ejecutar, error, pendiente, limpiarError } = useCapacidad("erp");
  const [efecto, setEfecto] = useState<"conceder" | "denegar">("conceder");
  const [permiso, setPermiso] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const puede = new Set(p.concedibles);
  const opciones = p.catalogo
    .filter((m) => m.activo)
    .flatMap((m) =>
      [
        ...m.recursos.flatMap((r) => [r.ver, r.gestionar]),
        ...m.especiales.map((e) => e.id),
      ].flatMap((id) =>
        id && (efecto === "denegar" || puede.has(id))
          ? [{ valor: id, etiqueta: nombrePermiso(id), detalle: nombreModulo(m.modulo) }]
          : [],
      ),
    );

  const cerrar = () => {
    setPermiso(null);
    setMotivo("");
    limpiarError();
    p.onCerrar();
  };

  async function guardar() {
    if (!permiso) return;
    const r = await ejecutar("core.excepciones.set", {
      membershipId: p.membershipId,
      permiso,
      efecto,
      motivo: motivo.trim(),
    });
    if (r) {
      avisar.exito(efecto === "conceder" ? "Permiso concedido" : "Permiso denegado");
      p.onGuardada();
      cerrar();
    }
  }

  return (
    <Dialog
      abierto={p.abierto}
      onCerrar={cerrar}
      titulo="Agregar excepción"
      descripcion="Si una excepción deniega algo que el rol concede, gana la denegación."
      acciones={
        <>
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || !permiso || motivo.trim().length < 3}
            onClick={guardar}
          >
            {pendiente ? "Guardando…" : "Guardar excepción"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmentado
          etiqueta="Tipo de excepción"
          activa={efecto}
          opciones={[
            {
              id: "conceder",
              etiqueta: "Conceder",
              onClick: () => {
                setEfecto("conceder");
                if (permiso && !puede.has(permiso)) setPermiso(null);
              },
            },
            { id: "denegar", etiqueta: "Denegar", onClick: () => setEfecto("denegar") },
          ]}
        />
        <Campo etiqueta="Permiso" htmlFor="exc-permiso">
          <Combobox
            id="exc-permiso"
            opciones={opciones}
            valor={permiso}
            onCambiar={(v) => setPermiso(v[0] ?? null)}
            placeholder="Elegir permiso…"
            buscarPlaceholder="Buscar permiso"
          />
        </Campo>
        <Campo
          etiqueta="Motivo"
          htmlFor="exc-motivo"
          ayuda={`${motivo.length}/200`}
          {...(error ? { error } : {})}
        >
          <Textarea
            id="exc-motivo"
            value={motivo}
            maxLength={200}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
      </div>
    </Dialog>
  );
}
