"use client";

import { useMemo, useState } from "react";

import { Alerta, Button, Dialog } from "@opai/ds";

import { MODULOS_BLOQUEADOS, type ModuloCatalogo, nombreModulo } from "./etiquetas";
import { MatrizModulo } from "./matriz-modulo";

type Props = {
  catalogo: readonly ModuloCatalogo[];
  valor: readonly string[];
  /** Sin `onCambiar` la matriz es de solo lectura (roles del sistema o sin permiso de gestión). */
  onCambiar?: (permisos: string[]) => void;
  /** Permisos que el usuario actual puede conceder (nadie concede lo que no tiene, §16.2). */
  concedibles: readonly string[];
};

const moduloDe = (id: string) => id.slice(0, id.indexOf(":"));

/**
 * Matriz de permisos módulo × acción (sábana 07c, A2). Los permisos de plataforma nunca llegan aquí
 * (el catálogo no los trae). Activar Finanzas o Nómina pide confirmación explícita (§16.2).
 */
export function MatrizPermisos({ catalogo, valor, onCambiar, concedibles }: Props) {
  const elegidos = useMemo(() => new Set(valor), [valor]);
  const puede = useMemo(
    () => (onCambiar ? new Set(concedibles) : null),
    [onCambiar, concedibles],
  );
  const [confirmar, setConfirmar] = useState<string | null>(null);

  const aplicar = (id: string, on: boolean) =>
    onCambiar?.(on ? [...valor, id] : valor.filter((p) => p !== id));

  const alternar = (id: string, on: boolean) => {
    const modulo = moduloDe(id);
    const primero = !valor.some((p) => moduloDe(p) === modulo);
    if (on && primero && MODULOS_BLOQUEADOS.has(modulo)) setConfirmar(id);
    else aplicar(id, on);
  };

  const modulo = confirmar ? nombreModulo(moduloDe(confirmar)) : "";
  return (
    <div className="flex flex-col">
      {valor.length === 0 ? (
        <Alerta tono="info" titulo="Este rol no da acceso a nada todavía" className="mb-2" />
      ) : null}
      {puede ? (
        <p className="t-caption pb-2">
          Lo que no puedes conceder aparece deshabilitado. Crear roles y conceder permisos lo hace
          siempre una persona: un agente con API key no puede hacerlo.
        </p>
      ) : null}
      {catalogo.map((m) => (
        <MatrizModulo
          key={m.modulo}
          m={m}
          valor={elegidos}
          concedibles={puede}
          onAlternar={alternar}
        />
      ))}
      <Dialog
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={`¿Dar acceso a ${modulo}?`}
        descripcion={`Vas a dar acceso a ${modulo} a este rol. Las personas con este rol verán información financiera de la empresa.`}
        acciones={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (confirmar) aplicar(confirmar, true);
                setConfirmar(null);
              }}
            >
              Dar acceso
            </Button>
          </>
        }
      />
    </div>
  );
}
