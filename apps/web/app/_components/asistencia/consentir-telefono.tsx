"use client";

import { useRouter } from "next/navigation";

import { Alerta, avisar, Button, Card, CardContent } from "@opai/ds";

import { useEjecutorAsistencia } from "./use-ejecutor";

/** Antes del primer uso del teléfono personal, la persona acepta su uso (T-04); es voluntario y revocable. */
export function ConsentirTelefono({ texto }: { texto: string }) {
  const { ejecutar, pendiente, error } = useEjecutorAsistencia("telefono");
  const router = useRouter();
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <h3 className="t-heading text-fg">Marcar desde tu teléfono</h3>
        <p className="text-md text-fg-muted text-pretty">{texto}</p>
        <Button size="lg" block disabled={pendiente} onClick={() => void ejecutar("asistencia.rostro.consentir", { proposito: "telefono_personal_asistencia" }).then((r) => { if (r) { avisar.exito("Listo, ya puedes marcar"); router.refresh(); } })}>
          Acepto
        </Button>
      </CardContent>
    </Card>
  );
}
