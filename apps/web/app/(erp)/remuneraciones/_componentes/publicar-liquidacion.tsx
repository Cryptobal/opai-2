"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = {
  liquidacionId: string;
  correoPersonal: string | null;
  publicadaEn: string | null;
};

/** Publicar liquidación revisada al portal del trabajador (diseño 04, CAR-99). */
export function PublicarLiquidacion({ liquidacionId, correoPersonal, publicadaEn }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const router = useRouter();
  const [previa, setPrevia] = useState(false);
  if (publicadaEn) {
    return <p className="t-caption text-fg-muted">Publicada al trabajador el {publicadaEn.slice(0, 10)}.</p>;
  }
  async function publicar(dry = false) {
    const r = await ejecutar<{ yaPublicada: boolean }>("nomina.liquidaciones.publicar", { id: liquidacionId }, dry);
    if (!r) return;
    if (dry) {
      setPrevia(true);
      return;
    }
    avisar.exito(r.yaPublicada ? "La liquidación ya estaba publicada." : "Liquidación publicada al trabajador.");
    setPrevia(false);
    router.refresh();
  }
  const pie =
    correoPersonal != null
      ? `Al publicar, la liquidación queda en Mis documentos del Portal Trabajador y se envía a su correo personal: ${correoPersonal}`
      : "Al publicar, la liquidación queda en Mis documentos del Portal Trabajador. Esta persona no tiene correo personal registrado.";
  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" className="self-start" disabled={pendiente} onClick={() => void publicar(true)}>
        Publicar al trabajador
      </Button>
      {previa ? (
        <Alerta
          tono="info"
          titulo="Se generará el PDF y quedará visible en el portal del trabajador."
          accion={
            <Button disabled={pendiente} onClick={() => void publicar(false)}>
              Confirmar publicación
            </Button>
          }
        />
      ) : null}
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <p className="t-caption text-fg-muted">{pie}</p>
    </div>
  );
}