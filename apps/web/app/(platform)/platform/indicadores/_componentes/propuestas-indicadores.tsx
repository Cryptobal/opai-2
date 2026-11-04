"use client";

import { Alerta, avisar, Badge, Button, Empty, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { fechaHora } from "@/lib/formato";

import { type DatosIndicadores, MOTIVO_FALLA, NOMBRE_INDICADOR, type Propuesta, textoValor } from "./tipos";

function Valor({ titulo, valor }: { titulo: string; valor: unknown }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="t-caption mb-1">{titulo}</p>
      <pre className="t-caption max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface-2 p-2 text-fg">
        {textoValor(valor)}
      </pre>
    </div>
  );
}

function TarjetaPropuesta({ p, disabled, onResolver }: {
  p: Propuesta; disabled: boolean; onResolver: (p: Propuesta, aprobar: boolean) => void;
}) {
  return (
    <SeccionTarjeta
      titulo={NOMBRE_INDICADOR[p.clave] ?? p.nombre}
      accion={<span className="t-caption">Rige desde el {p.vigenteDesde}</span>}
    >
      <div className="flex flex-col gap-3 md:flex-row">
        <Valor titulo="Vigente" valor={p.valorVigente} />
        <Valor titulo="Propuesto" valor={p.valorPropuesto} />
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={disabled} onClick={() => onResolver(p, false)}>Rechazar</Button>
        <Button disabled={disabled} onClick={() => onResolver(p, true)}>Aprobar para todas las empresas</Button>
      </div>
    </SeccionTarjeta>
  );
}

/** Valores legales: cambios propuestos por la captura de Previred y el resultado de su última corrida. */
export function PropuestasIndicadores({ datos }: { datos: DatosIndicadores }) {
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  async function resolver(p: Propuesta, aprobar: boolean) {
    const r = await ejecutar("platform.indicadores.resolver", { propuestaId: p.id, aprobar });
    if (r) avisar.exito(aprobar ? "Valor aprobado" : "Propuesta rechazada");
  }
  const fallas = datos.capturas.filter((c) => c.alerta);
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {fallas.map((c) => (
        <Alerta
          key={c.clave}
          tono="warning"
          titulo={`${NOMBRE_INDICADOR[c.clave] ?? c.clave}: se sigue usando el último valor`}
        >
          {MOTIVO_FALLA[c.motivo ?? ""] ?? "La última captura falló."} ({fechaHora(c.capturadoEn)})
        </Alerta>
      ))}
      {datos.propuestas.length === 0 ? (
        <Empty
          titulo="Sin cambios por aprobar"
          descripcion="La captura mensual de Previred no encontró diferencias con los valores vigentes."
        />
      ) : (
        datos.propuestas.map((p) => (
          <TarjetaPropuesta key={p.id} p={p} disabled={pendiente} onResolver={(x, a) => void resolver(x, a)} />
        ))
      )}
      <div className="flex flex-wrap gap-2">
        {datos.capturas.map((c) => (
          <Badge key={c.clave} tono={c.alerta ? "warning" : "success"}>
            {NOMBRE_INDICADOR[c.clave] ?? c.clave}: {c.resultado === "propuesto" ? "con cambio" : c.alerta ? "con aviso" : "al día"}
          </Badge>
        ))}
      </div>
    </div>
  );
}
