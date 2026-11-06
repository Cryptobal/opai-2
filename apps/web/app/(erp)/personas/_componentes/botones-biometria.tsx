"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Dialog } from "@opai/ds";

import { CapturaVida } from "@/app/_components/biometria/captura-vida";
import { consentido, type EstadoBiometria, type TextoConsentimientoVista } from "@/app/_components/biometria/tipos";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Modo = "consentir_rostro" | "enrolar" | "baja" | "consentir_telefono" | null;

/** Acciones de RR. HH. sobre el rostro y el teléfono de una persona: cada una muestra su texto y confirma. */
export function BotonesBiometria({
  personaId, nombre, estado, textos,
}: { personaId: string; nombre: string; estado: EstadoBiometria; textos: TextoConsentimientoVista[] }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [modo, setModo] = useState<Modo>(null);
  const cerrar = () => {
    setModo(null);
    limpiarError();
  };
  const texto = (tipo: TextoConsentimientoVista["tipo"]) => textos.find((x) => x.tipo === tipo)?.texto ?? "";
  const rostro = consentido(estado, "biometria_facial");

  async function consentir(tipo: "biometria_facial" | "telefono_personal") {
    if (!(await ejecutar("asistencia.consentimientos.registrar", { personaId, tipo }))) return;
    avisar.exito("Consentimiento registrado");
    cerrar();
  }
  async function enrolar(sesionVidaId: string) {
    if (!(await ejecutar("asistencia.biometria.enrolar_rrhh", { personaId, sesionVidaId }))) return;
    avisar.exito("Rostro enrolado");
    cerrar();
  }
  async function darDeBaja() {
    if (!(await ejecutar("asistencia.biometria.dar_de_baja", { personaId }))) return;
    avisar.exito("Biometría borrada. Marca con RUT y PIN.");
    cerrar();
  }
  async function telefono(habilitado: boolean) {
    if (await ejecutar("asistencia.telefono.habilitar", { personaId, habilitado }))
      avisar.exito(habilitado ? "Teléfono personal habilitado" : "Teléfono personal deshabilitado");
  }

  const titulo = {
    consentir_rostro: `Consentimiento del rostro de ${nombre}`,
    consentir_telefono: `Consentimiento del teléfono de ${nombre}`,
    enrolar: `Enrolar el rostro de ${nombre}`,
    baja: `Borrar la biometría de ${nombre}`,
  };
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {!rostro ? <Button variant="secondary" onClick={() => setModo("consentir_rostro")}>Registrar consentimiento del rostro</Button> : null}
        {rostro ? <Button variant="secondary" onClick={() => setModo("enrolar")}>{estado.rostroEnrolado ? "Volver a enrolar" : "Enrolar rostro"}</Button> : null}
        {estado.rostroEnrolado ? <Button variant="secondary" onClick={() => setModo("baja")}>Borrar biometría</Button> : null}
        {!consentido(estado, "telefono_personal") ? <Button variant="secondary" onClick={() => setModo("consentir_telefono")}>Registrar consentimiento del teléfono</Button> : null}
        <Button variant="secondary" onClick={() => void telefono(!estado.telefonoPersonalHabilitado)} disabled={pendiente}>
          {estado.telefonoPersonalHabilitado ? "Deshabilitar teléfono" : "Habilitar teléfono"}
        </Button>
      </div>
      <Dialog
        abierto={modo !== null}
        onCerrar={cerrar}
        titulo={modo ? titulo[modo] : ""}
        descripcion={modo === "enrolar" ? "La persona debe estar presente frente a la cámara." : ""}
        acciones={
          modo === "consentir_rostro" || modo === "consentir_telefono" ? (
            <>
              <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
              <Button disabled={pendiente} onClick={() => void consentir(modo === "consentir_rostro" ? "biometria_facial" : "telefono_personal")}>Registrar</Button>
            </>
          ) : modo === "baja" ? (
            <>
              <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
              <Button disabled={pendiente} onClick={() => void darDeBaja()}>Borrar biometría</Button>
            </>
          ) : (
            <></>
          )
        }
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {modo === "consentir_rostro" || modo === "consentir_telefono" ? (
          <p className="text-md text-fg-muted text-pretty">{texto(modo === "consentir_rostro" ? "biometria_facial" : "telefono_personal")}</p>
        ) : null}
        {modo === "enrolar" ? <CapturaVida portal="erp" etiquetaAccion="Enrolar rostro" onListo={enrolar} deshabilitado={pendiente} /> : null}
        {modo === "baja" ? <p className="text-md text-fg-muted">Se borra su rostro en el proveedor y en la base. No se puede deshacer; la persona sigue marcando con su RUT y PIN.</p> : null}
      </Dialog>
    </>
  );
}
