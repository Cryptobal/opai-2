"use client";

import { Mail } from "lucide-react";
import { useMemo, useState } from "react";

import { avisar, BarraSeleccion, Button, ChipToggle, Empty } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { LeyendaVencimientos } from "./leyenda-vencimientos";
import { TablaMatriz } from "./tabla-matriz";
import { type EstadoCelda, type Matriz, pendientes } from "./tipos-matriz";

type Resultado = { enviados: { personaId: string }[]; sinCorreo: { nombre: string }[] };

const FILTROS: { estado: EstadoCelda; etiqueta: string; clave: keyof Matriz["resumen"] }[] = [
  { estado: "vencido", etiqueta: "Vencidos", clave: "vencidos" },
  { estado: "por_vencer", etiqueta: "Vencen pronto", clave: "porVencer" },
  { estado: "falta", etiqueta: "Faltan", clave: "faltan" },
];

/** Semáforo de vencimientos (58/59): filtros rápidos, selección y "Pedir renovación" en bloque. */
export function MatrizVencimientos({ m }: { m: Matriz }) {
  const [filtros, setFiltros] = useState<Set<EstadoCelda>>(
    () => new Set(["vencido", "por_vencer"]),
  );
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set());
  const { ejecutar, pendiente } = useCapacidad("erp");
  const filas = useMemo(
    () => m.filas.filter((f) => f.celdas.some((c) => filtros.has(c.estado))),
    [m.filas, filtros],
  );
  const elegidas = m.filas.filter((f) => seleccion.has(f.personaId));
  const documentos = elegidas.reduce((n, f) => n + pendientes(f).length, 0);
  function marcar(ids: string[], marcado: boolean) {
    setSeleccion((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (marcado) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  }
  async function pedir() {
    const pedidos = elegidas
      .map((f) => ({ personaId: f.personaId, tipoIds: pendientes(f).map((c) => c.tipoId) }))
      .filter((p) => p.tipoIds.length > 0);
    const r = await ejecutar<Resultado>("core.documentos.pedir_renovacion", { pedidos });
    if (!r) return;
    avisar.exito(
      `Pedido enviado a ${r.enviados.length} ${r.enviados.length === 1 ? "persona" : "personas"}`,
    );
    if (r.sinCorreo.length)
      avisar.error(`Sin correo: ${r.sinCorreo.map((s) => s.nombre).join(", ")}`);
    setSeleccion(new Set());
  }
  return (
    <div className="flex flex-col gap-4">
      {m.limiteExcedido ? (
        <p role="status" className="text-base text-warning-fg">
          Hay más de 2.000 personas. El semáforo y sus cifras son parciales.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <ChipToggle
            key={f.estado}
            etiqueta={f.etiqueta}
            contador={m.resumen[f.clave]}
            activo={filtros.has(f.estado)}
            onCambiar={(a) =>
              setFiltros((s) => {
                const n = new Set(s);
                if (a) n.add(f.estado);
                else n.delete(f.estado);
                return n;
              })
            }
          />
        ))}
        {m.resumen.personas > 0 ? (
          <span className="t-caption ml-auto hidden md:block">
            {m.resumen.conPendientes} con algo pendiente de {m.resumen.personas}
          </span>
        ) : null}
      </div>
      {filas.length ? (
        <TablaMatriz tipos={m.tipos} filas={filas} seleccion={seleccion} onMarcar={marcar} />
      ) : m.resumen.personas === 0 ? (
        <Empty
          titulo="Aún no hay personas"
          descripcion="Cuando agregues personas, aquí verás el estado de sus documentos."
        />
      ) : (
        <Empty
          titulo="Nada pendiente con estos filtros"
          descripcion={
            m.resumen.conPendientes
              ? "Hay pendientes en los otros filtros: actívalos para verlos."
              : "Todos los documentos están al día."
          }
        />
      )}
      <LeyendaVencimientos />
      {elegidas.length ? (
        <BarraSeleccion
          texto={`${elegidas.length} ${elegidas.length === 1 ? "persona" : "personas"} · ${documentos} documentos`}
          detalle="Se pide por correo a cada persona"
        >
          <Button
            variant="ghost"
            className="hidden text-inverse-fg md:inline-flex"
            onClick={() => setSeleccion(new Set())}
          >
            Quitar selección
          </Button>
          <Button disabled={pendiente || !documentos} onClick={() => void pedir()}>
            <Mail className="size-4" aria-hidden /> Pedir renovación
          </Button>
        </BarraSeleccion>
      ) : null}
    </div>
  );
}
