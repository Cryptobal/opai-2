"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Card, CardContent, Dialog } from "@opai/ds";

import { EnrolarRostro } from "./enrolar-rostro";
import type { EstadoAsistencia } from "./tipos";
import { useEjecutorAsistencia } from "./use-ejecutor";

/** Mi rostro: enrolar (con consentimiento) o revocar y borrar. Revocar es inmediato y sigue marcando con RUT y PIN. */
export function MiRostro({ estado, texto }: { estado: EstadoAsistencia; texto: string }) {
  const ejecutor = useEjecutorAsistencia("telefono");
  const { ejecutar, pendiente, error, limpiarError } = ejecutor;
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const revocar = async () => {
    if (!(await ejecutar("asistencia.rostro.revocar", { proposito: "biometria_asistencia" }))) return;
    avisar.exito("Tu rostro se borró. Marca con tu RUT y PIN.");
    setAbierto(false);
    router.refresh();
  };
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {estado.rostroEnrolado ? (
          <>
            <p className="text-md text-fg">Tu rostro está enrolado. Si falla, siempre puedes marcar con tu RUT y PIN.</p>
            <Button variant="secondary" block onClick={() => setAbierto(true)}>Revocar y borrar mi rostro</Button>
            <Dialog abierto={abierto} onCerrar={() => { setAbierto(false); limpiarError(); }} titulo="¿Borrar tu rostro?"
              descripcion="Se elimina tu rostro del reconocimiento facial. Seguirás marcando con tu RUT y PIN."
              acciones={<><Button variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button><Button onClick={() => void revocar()} disabled={pendiente}>Revocar y borrar</Button></>}>
              {error ? <Alerta tono="danger" titulo={error} /> : null}
            </Dialog>
          </>
        ) : (
          <EnrolarRostro ejecutor={ejecutor} base={{}} estado={estado} texto={texto} nombreSugerido="prueba" onListo={() => router.refresh()} />
        )}
      </CardContent>
    </Card>
  );
}
