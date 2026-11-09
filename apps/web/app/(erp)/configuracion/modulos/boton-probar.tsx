"use client";

import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = { moduloId: string; nombre: string; dias: number; rutCompleto: boolean };

/** «Probar 10 días»: la empresa activa su única prueba gratis del módulo, tras confirmar (CAR-222). */
export function BotonProbar({ moduloId, nombre, dias, rutCompleto }: Props) {
  const [abierta, setAbierta] = useState(false);
  const { ejecutar, pendiente, error } = useCapacidad("erp");

  async function activar() {
    if (await ejecutar("core.modules.probar", { moduloId })) {
      avisar.exito(`Prueba de ${nombre} activada por ${dias} días`);
      setAbierta(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setAbierta(true)}>
        <FlaskConical className="size-4" aria-hidden />
        Probar {dias} días
      </Button>
      {abierta ? (
        <Sheet
          abierto
          onCerrar={() => setAbierta(false)}
          titulo={`Probar ${nombre} ${dias} días`}
          descripcion="Es gratis y no genera cobros. Se usa una sola vez por módulo."
          acciones={
            <>
              <Button variant="secondary" onClick={() => setAbierta(false)}>
                Cancelar
              </Button>
              <Button disabled={pendiente || !rutCompleto} onClick={() => void activar()}>
                {pendiente ? "Activando…" : "Activar prueba"}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {error ? <Alerta tono="danger" titulo={error} /> : null}
            {rutCompleto ? null : (
              <Alerta
                tono="warning"
                titulo="Completa el RUT de la empresa antes de activar una prueba."
              >
                <Link href="/configuracion/empresa" className="underline">
                  Ir a Datos de la empresa
                </Link>
              </Alerta>
            )}
            <ul className="t-body list-disc pl-5 text-fg-muted">
              <li>Dura {dias} días contando hoy y se desactiva sola.</li>
              <li>Al terminar, el módulo queda en solo lectura: no se borra nada.</li>
              <li>Si necesitas más tiempo, lo extiende OPAI.</li>
            </ul>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
