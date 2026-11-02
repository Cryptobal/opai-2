"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp, type SemanaFlujo } from "./datos";

export function HojaCierre({ semanas }: { semanas: SemanaFlujo[] }) {
  const [abierta, setAbierta] = useState(false);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const abiertas = semanas.filter((s) => !s.sellada);
  const [semana, setSemana] = useState(abiertas[0]?.semana ?? "");
  const [banco, setBanco] = useState("");
  const [motivo, setMotivo] = useState("");
  const [vista, setVista] = useState<{ diferencia: number; exigeMotivo?: boolean } | null>(null);

  useEffect(() => {
    if (!abierta) return;
    void ejecutar<{ saldo: number | null }>("finanzas.bancos.saldo_sugerido", {}).then((r) => {
      if (r?.saldo != null) setBanco(String(r.saldo));
    });
  }, [abierta, ejecutar]);

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
            <Button variant="secondary" onClick={() => setAbierta(false)}>Cancelar</Button>
            {sel?.sellada ? (
              <Button disabled={pendiente || motivo.trim().length < 3} onClick={() => void reabrir()}>
                Reabrir
              </Button>
            ) : vista ? (
              <Button disabled={pendiente} onClick={() => void sellar()}>Sellar</Button>
            ) : (
              <Button disabled={pendiente || !semana} onClick={() => void previsualizar()}>
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
                etiqueta: `${s.semana}${s.sellada ? " · sellada" : ""} · ${clp(s.saldoFinal)}`,
              }))}
            />
          </Campo>
          {!sel?.sellada ? (
            <Campo etiqueta="Saldo banco (CLP)" htmlFor="ci-ban">
              <Input id="ci-ban" value={banco} onChange={(e) => setBanco(e.target.value)} inputMode="numeric" />
            </Campo>
          ) : null}
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
