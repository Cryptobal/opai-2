"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Select, Sheet, Switch, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

import type { Responsable } from "./tipos";
import { useHojaNegocio } from "./use-hoja";

type Resumen = { negocios: number; valorMensual: number; tareas: number };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Transferir la cartera abierta de una persona a otra (CAR-27; diseño `Negocios·cartera`): sus negocios
 * abiertos y, si se elige, sus tareas pendientes. Muestra qué se moverá antes de confirmar (vista previa
 * de la misma capacidad) y el nuevo responsable recibe un aviso con el mensaje.
 */
export function HojaTransferir({ responsables }: { responsables: Responsable[] }) {
  const hoja = useHojaNegocio("transferir");
  const previa = useCapacidad("erp");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [de, setDe] = useState("");
  const [a, setA] = useState("");
  const [tareas, setTareas] = useState(true);
  const [mensaje, setMensaje] = useState("");
  // La vista previa es de una combinación (de, a, tareas): se muestra solo si sigue siendo la elegida.
  const [previo, setPrevio] = useState<{ clave: string; r: Resumen } | null>(null);
  const clave = `${de}|${a}|${tareas}`;
  const resumen = previo?.clave === clave ? previo.r : null;
  const entrada = { deResponsableId: de, nuevoResponsableId: a, incluirTareas: tareas, ...(mensaje.trim() ? { mensaje: mensaje.trim() } : {}) };
  const listo = !!de && !!a && de !== a;

  /** Recalcula la vista previa al cambiar quién, a quién o las tareas (el mensaje no cambia el resumen). */
  function elegir(c: { de?: string; a?: string; tareas?: boolean }) {
    const n = { de: c.de ?? de, a: c.a ?? a, tareas: c.tareas ?? tareas };
    setDe(n.de);
    setA(n.a);
    setTareas(n.tareas);
    if (!n.de || !n.a || n.de === n.a) return;
    const k = `${n.de}|${n.a}|${n.tareas}`;
    void previa
      .ejecutar<Resumen>("comercial.negocios.transferir", { deResponsableId: n.de, nuevoResponsableId: n.a, incluirTareas: n.tareas }, true)
      .then((r) => r && setPrevio({ clave: k, r }));
  }

  async function transferir() {
    const r = await ejecutar<Resumen>("comercial.negocios.transferir", entrada);
    if (!r) return;
    avisar.exito(`Se transfirieron ${plural(r.negocios, "negocio", "negocios")}`);
    hoja.cerrar();
  }

  const nombre = (id: string) => responsables.find((x) => x.id === id)?.nombre ?? "";
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={de ? `Transferir cartera de ${nombre(de)}` : "Transferir cartera"}
      descripcion="Sus negocios abiertos pasan a otra persona, que recibe un aviso."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || !listo || !resumen?.negocios} onClick={() => void transferir()}>
            {pendiente ? "Transfiriendo…" : "Transferir"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="De" htmlFor="transferir-de">
          <Select
            id="transferir-de"
            valor={de || undefined}
            onCambiar={(v) => elegir({ de: v })}
            placeholder="Elige a quién le sacas la cartera"
            opciones={responsables
              .filter((r) => r.abiertos > 0)
              .map((r) => ({ valor: r.id, etiqueta: `${r.nombre} · ${plural(r.abiertos, "abierto", "abiertos")}` }))}
          />
        </Campo>
        <Campo etiqueta="Nuevo responsable" htmlFor="transferir-a">
          <Select
            id="transferir-a"
            valor={a || undefined}
            onCambiar={(v) => elegir({ a: v })}
            placeholder="Elige quién la recibe"
            opciones={responsables.filter((r) => r.id !== de).map((r) => ({ valor: r.id, etiqueta: r.nombre }))}
          />
        </Campo>
        <Switch etiqueta="Tareas pendientes" descripcion="Las tareas abiertas de esos negocios" activo={tareas} onCambiar={(v) => elegir({ tareas: v })} />
        <Campo etiqueta="Mensaje" htmlFor="transferir-mensaje" ayuda="Opcional. Le llega en su aviso.">
          <Textarea id="transferir-mensaje" rows={3} maxLength={500} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
        </Campo>
        {resumen ? (
          <Alerta
            tono={resumen.negocios ? "info" : "warning"}
            titulo={
              resumen.negocios
                ? `${plural(resumen.negocios, "negocio", "negocios")} · ${pesos(resumen.valorMensual)} mensuales${tareas ? ` · ${plural(resumen.tareas, "tarea", "tareas")}` : ""}`
                : "No tiene negocios abiertos para transferir."
            }
          />
        ) : null}
      </div>
    </Sheet>
  );
}
