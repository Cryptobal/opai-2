"use client";

import { avisar, Campo, CampoSecreto, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Integracion } from "./tipos";

/** Credenciales propias (29): cifradas al guardar; solo se ve el sufijo enmascarado. */
export function Credenciales({ items, conNombre }: { items: Integracion[]; conNombre: boolean }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const campos = items.flatMap((i) => i.secretos.map((s) => ({ i, s })));
  if (!campos.length) return null;
  return (
    <SeccionTarjeta titulo="Credenciales">
      <div className="flex flex-col gap-4">
        {campos.map(({ i, s }) => {
          const id = `sec-${i.proveedor}-${s.nombre}`;
          return (
            <Campo
              key={id}
              etiqueta={conNombre ? i.nombre.replace(/^IA · /, "") : s.etiqueta}
              htmlFor={id}
            >
              <CampoSecreto
                id={id}
                aria-label={`${i.nombre}: ${s.etiqueta}`}
                guardado={s.mascara ? s.mascara.slice(-4) : null}
                pendiente={pendiente}
                placeholder={s.etiqueta}
                onGuardar={async (valor) => {
                  const r = await ejecutar("core.integraciones.set_secreto", {
                    proveedor: i.proveedor,
                    nombre: s.nombre,
                    valor,
                  });
                  if (r) avisar.exito("Credencial guardada cifrada");
                  else avisar.error("No se pudo guardar la credencial");
                }}
              />
            </Campo>
          );
        })}
      </div>
    </SeccionTarjeta>
  );
}
