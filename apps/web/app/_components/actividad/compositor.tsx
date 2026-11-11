"use client";

import { useId, useState } from "react";

import { Alerta, avisar, Button, CompositorActividad, Switch, type TipoCompositor } from "@opai/ds";

import { useMiembros } from "@/app/(erp)/solicitudes/_componentes/use-miembros";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { type Borrador, CamposActividad } from "./campos-actividad";
import { borradorInicial, entradaActividad } from "./entrada-actividad";
import { ETIQUETA_ENTIDAD, type FichaActividad } from "./tipos";

const manana = () => new Date(Date.now() + 86_400_000);

/**
 * Compositor conectado a `core.actividades.create` (CAR-162): registra sobre la ficha y la liga a las
 * fichas relacionadas, que se pueden quitar. Revalida la ruta al registrar.
 */
export function Compositor({
  ficha,
  onListo,
  className,
  tipoInicial = "nota",
}: {
  tipoInicial?: TipoCompositor;
  ficha: FichaActividad;
  onListo?: () => void;
  className?: string;
}) {
  const id = useId();
  const [tipo, setTipo] = useState<TipoCompositor>(tipoInicial);
  const [b, setB] = useState<Borrador>(() =>
    tipoInicial === "tarea" ? { ...borradorInicial(manana()), hora: "09:00" } : borradorInicial(),
  );
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const miembros = useMiembros(tipo === "tarea");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const cambiar = (c: Partial<Borrador>) => setB((x) => ({ ...x, ...c }));
  const elegirTipo = (t: TipoCompositor) => {
    setTipo(t);
    // Una tarea nueva vence mañana a las 09:00 salvo que se haya elegido otra fecha.
    if (t === "tarea" && !b.tocoFecha) cambiar({ ...borradorInicial(manana()), texto: b.texto, hora: "09:00" });
  };
  const relacionadas = ficha.relacionadas.filter((r) => !quitadas.includes(`${r.tipo}:${r.id}`));
  // Solo en un negocio (o ligada a uno) la marca «El cliente respondió» tiene efecto (CAR-160).
  const conNegocio = ficha.tipo === "negocio" || relacionadas.some((r) => r.tipo === "negocio");
  async function registrar() {
    const vinculos = [{ tipo: ficha.tipo, id: ficha.id }, ...relacionadas.map(({ tipo: t, id: i }) => ({ tipo: t, id: i }))];
    const r = await ejecutar(
      "core.actividades.create",
      entradaActividad(tipo, b, vinculos),
      false,
      "layout",
      crypto.randomUUID(),
    );
    if (!r) return;
    avisar.exito(tipo === "tarea" ? "Tarea creada" : "Actividad registrada");
    setB(borradorInicial());
    setTipo("nota");
    onListo?.();
  }
  return (
    <CompositorActividad
      {...(className ? { className } : {})}
      tipo={tipo}
      onTipo={elegirTipo}
      ayuda={tipo === "tarea" ? "Llega a Mis tareas de sus responsables" : "Puedes cambiar la fecha a una pasada"}
      error={error ? <Alerta tono="danger" titulo={error} /> : null}
      vinculos={[
        { clave: `${ficha.tipo}:${ficha.id}`, etiqueta: ETIQUETA_ENTIDAD[ficha.tipo], valor: ficha.nombre },
        ...relacionadas.map((r) => ({
          clave: `${r.tipo}:${r.id}`,
          etiqueta: ETIQUETA_ENTIDAD[r.tipo],
          valor: r.nombre,
          onQuitar: () => setQuitadas((q) => [...q, `${r.tipo}:${r.id}`]),
        })),
      ]}
      accion={
        <Button
          disabled={pendiente || !b.texto.trim() || !b.dia}
          onClick={() => void registrar()}
          className="max-sm:w-full"
        >
          {pendiente ? "Registrando…" : tipo === "tarea" ? "Crear tarea" : "Registrar"}
        </Button>
      }
    >
      <CamposActividad id={id} tipo={tipo} b={b} cambiar={cambiar} miembros={miembros} />
      {tipo !== "tarea" && conNegocio ? (
        <Switch
          etiqueta="El cliente respondió"
          descripcion="Pausa el seguimiento del negocio según su plan."
          activo={b.respuestaCliente}
          onCambiar={(respuestaCliente) => cambiar({ respuestaCliente })}
        />
      ) : null}
    </CompositorActividad>
  );
}
