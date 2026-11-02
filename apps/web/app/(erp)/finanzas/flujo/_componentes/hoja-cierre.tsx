"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import {
  ayudaProcedenciaSaldo,
  etiquetaSemanaCierre,
  puedeVistaPreviaCierre,
  saldoInicialDesdeSugerido,
  type SaldoSugeridoCierre,
} from "./cierre-ui";
import { clp, type SemanaFlujo } from "./datos";

export function HojaCierre({ semanas }: { semanas: SemanaFlujo[] }) {
  const [abierta, setAbierta] = useState(false);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const abiertas = semanas.filter((s) => !s.sellada);
  const [semana, setSemana] = useState(abiertas[0]?.semana ?? "");
  const [banco, setBanco] = useState("");
  const [motivo, setMotivo] = useState("");
  const [metaSaldo, setMetaSaldo] = useState<SaldoSugeridoCierre | null>(null);
  const [vista, setVista] = useState<{ diferencia: number; exigeMotivo?: boolean } | null>(null);

  useEffect(() => {
    if (!abierta || !semana) return;
    setBanco("");
    setVista(null);
    setMetaSaldo(null);
    let cancelado = false;
    void ejecutar<SaldoSugeridoCierre>("finanzas.bancos.saldo_sugerido", { semana }).then((r) => {
      if (cancelado || !r) return;
      setMetaSaldo(r);
      const inicial = saldoInicialDesdeSugerido(r.saldo);
      if (inicial !== undefined) setBanco(inicial);
    });
    return () => {
      cancelado = true;
    };
    // Solo al abrir la hoja o cambiar de semana; `ejecutar` cambia cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- V211-01
  }, [abierta, semana]);

  const entrada = () => ({
    semana,
    saldoBanco: Number(banco.replace(/\./g, "").replace(",", ".")),
    ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
  });

  async function previsualizar() {
    const r = await ejecutar<{ diferencia: number; motivo: string | null }>(
      "finanzas.cierres.sellar",
      entrada(),
      true,
    );
    if (r) setVista({ diferencia: r.diferencia, exigeMotivo: r.motivo != null });
  }

  async function sellar() {
    const r = await ejecutar("finanzas.cierres.sellar", entrada());
    if (!r) return;
    avisar.exito("Semana sellada");
    setAbierta(false);
  }

  async function reabrir() {
    if (!motivo.trim()) return;
    const r = await ejecutar("finanzas.cierres.reabrir", { semana, motivo: motivo.trim() });
    if (!r) return;
    avisar.exito("Semana reabierta");
    setAbierta(false);
  }

  const sel = semanas.find((s) => s.semana === semana);
  const ayudaSaldo = ayudaProcedenciaSaldo(metaSaldo);

  return (
    <>
      <Button variant="secondary" onClick={() => setAbierta(true)}>
        Cierre semanal…
      </Button>
      <Sheet
        abierto={abierta}
        onCerrar={() => setAbierta(false)}
        titulo="Cierre semanal"
        descripcion="Compara el saldo sugerido con el banco y sella la semana."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierta(false)}>
              Cancelar
            </Button>
            {sel?.sellada ? (
              <Button disabled={pendiente || motivo.trim().length < 3} onClick={() => void reabrir()}>
                Reabrir
              </Button>
            ) : vista ? (
              <Button disabled={pendiente} onClick={() => void sellar()}>
                Sellar
              </Button>
            ) : (
              <Button
                disabled={!puedeVistaPreviaCierre({ semana, banco, pendiente })}
                onClick={() => void previsualizar()}
              >
                Vista previa
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <Campo etiqueta="Semana" htmlFor="ci-sem">
            <Select
              id="ci-sem"
              valor={semana}
              onCambiar={(v) => {
                setSemana(v);
                setVista(null);
              }}
              opciones={semanas.map((s) => ({
                valor: s.semana,
                etiqueta: etiquetaSemanaCierre(s),
              }))}
            />
          </Campo>
          {!sel?.sellada ? (
            <Campo
              etiqueta="Saldo banco (CLP)"
              htmlFor="ci-ban"
              {...(ayudaSaldo ? { ayuda: ayudaSaldo } : {})}
            >
              <Input
                id="ci-ban"
                value={banco}
                onChange={(e) => {
                  setBanco(e.target.value);
                  setVista(null);
                }}
                inputMode="numeric"
              />
            </Campo>
          ) : null}
          {metaSaldo?.aviso ? <Alerta tono="warning" titulo={metaSaldo.aviso} /> : null}
          <Campo etiqueta="Motivo" htmlFor="ci-mot">
            <Textarea id="ci-mot" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} />
          </Campo>
          {vista ? (
            <Alerta tono="info" titulo={`Diferencia ${clp(vista.diferencia)}`}>
              {vista.exigeMotivo ? "Indica motivo si supera la tolerancia." : null}
            </Alerta>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
