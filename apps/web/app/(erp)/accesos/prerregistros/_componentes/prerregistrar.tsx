"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { avisoPrerregistro, cuantos, entradaPrerregistro, vacio } from "./borrador";
import { CamposPrerregistro } from "./campos-prerregistro";
import type { Prerregistro } from "./datos";
import { rango } from "./etiquetas";

type Props = {
  instalaciones: { id: string; nombre: string }[];
  instalacionId?: string;
  hoy: string;
};

/** Éxito: un enlace a la invitación de cada visitante (primer día) y «Prerregistrar otra». */
function Listo({ p, otra }: { p: Prerregistro; otra: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Alerta tono="success" titulo="Visita prerregistrada">
        {p.visitantes.length === 1 ? "1 visitante" : `${p.visitantes.length} visitantes`}, válido
        {p.desde === p.hasta ? " el " : " del "}
        {rango(p)}. El guardia los verá como autorizados.
      </Alerta>
      <ul className="flex flex-col gap-2">
        {p.visitantes.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3">
            <span className="t-body truncate">{v.nombre}</span>
            <EnlaceBoton
              variante="secondary"
              href={`/accesos/prerregistros/${p.id}/invitacion?visitante=${v.id}&dia=${p.desde}`}
            >
              Ver invitación
            </EnlaceBoton>
          </li>
        ))}
      </ul>
      <Button variant="ghost" className="self-start" onClick={otra}>
        Prerregistrar otra
      </Button>
    </div>
  );
}

/** Pie de la hoja: qué se va a registrar (o qué falta) y el botón. */
function Pie(p: { texto: string; listo: boolean; pendiente: boolean; guardar: () => void }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="t-caption text-fg-muted">{p.texto}</p>
      <Button block size="lg" disabled={!p.listo} onClick={p.guardar}>
        {p.pendiente ? "Guardando…" : "Prerregistrar"}
      </Button>
    </div>
  );
}

/** «Prerregistrar» (diseño `Prerregistrar`): hoja a la derecha, a pantalla completa en teléfono. */
export function Prerregistrar({ instalaciones, instalacionId, hoy }: Props) {
  const inicial = () => vacio(instalacionId ?? instalaciones[0]?.id ?? "", hoy);
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  const [b, setB] = useState(inicial);
  const [hecho, setHecho] = useState<Prerregistro | null>(null);
  const aviso = avisoPrerregistro(b);

  async function guardar() {
    const r = await ejecutar<Prerregistro>("acceso.prerregistros.crear", entradaPrerregistro(b));
    if (!r) return;
    avisar.exito("Visita prerregistrada");
    setHecho(r);
  }
  const otra = () => {
    setB(inicial());
    setHecho(null);
  };

  return (
    <>
      <Button onClick={() => setAbierto(true)}>Prerregistrar</Button>
      <Sheet
        abierto={abierto}
        onCerrar={() => {
          limpiarError();
          setAbierto(false);
          otra();
        }}
        titulo="Prerregistrar visita"
        {...(hecho
          ? {}
          : {
              acciones: (
                <Pie
                  texto={aviso ?? `Se registrarán ${cuantos(b)}`}
                  listo={!pendiente && aviso === null}
                  pendiente={pendiente}
                  guardar={() => void guardar()}
                />
              ),
            })}
      >
        {error ? (
          <Alerta tono="danger" titulo="No pudimos prerregistrar" className="mb-3">
            {error}
          </Alerta>
        ) : null}
        {hecho ? (
          <Listo p={hecho} otra={otra} />
        ) : (
          <CamposPrerregistro b={b} set={setB} instalaciones={instalaciones} />
        )}
      </Sheet>
    </>
  );
}
