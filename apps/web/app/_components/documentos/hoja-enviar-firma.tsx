"use client";

import { useState } from "react";

import { avisar, Button, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useCapacidad } from "../use-capacidad";
import { useHojaUrl } from "../maestros/use-url";

const CLASES = [
  { valor: "acta", etiqueta: "Acta" },
  { valor: "acta_reunion", etiqueta: "Acta de reunión" },
  { valor: "recepcion_laboral", etiqueta: "Recepción laboral (toma de conocimiento)" },
  { valor: "carta_trabajador", etiqueta: "Carta al trabajador" },
  { valor: "propuesta_comercial", etiqueta: "Propuesta comercial" },
  { valor: "contrato_servicio", etiqueta: "Contrato de servicio" },
  { valor: "anexo_contrato", etiqueta: "Anexo de contrato (N2, a confirmar en diseño)" },
  { valor: "contrato_trabajo", etiqueta: "Contrato de trabajo (N2, a confirmar en diseño)" },
];
const NIVELES = [
  { valor: "N1", etiqueta: "N1 · firma simple" },
  { valor: "N2", etiqueta: "N2 · con código y verificación (firmar llega en otra entrega)" },
];
const TIPOS_FIRMANTE = [
  { valor: "externo", etiqueta: "Externo (cliente, proveedor)" },
  { valor: "contacto", etiqueta: "Contacto del cliente" },
  { valor: "trabajador", etiqueta: "Trabajador" },
];
const ORDENES = [
  { valor: "secuencial", etiqueta: "Secuencial" },
  { valor: "paralelo", etiqueta: "Paralelo" },
];

/**
 * Enviar a firma (firma.md §5, R4, R7, R19): congela el documento y crea la solicitud con un
 * firmante. Varios firmantes y la vista previa de huella quedan para el diseño (MVP de este PR).
 */
export function HojaEnviarFirma() {
  const hoja = useHojaUrl("firmar");
  const documentoId = hoja.valor;
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [clase, setClase] = useState("acta");
  const [nivel, setNivel] = useState("N1");
  const [orden, setOrden] = useState("secuencial");
  const [tipo, setTipo] = useState("externo");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  function cerrar() {
    setNombre("");
    setEmail("");
    setMensaje("");
    hoja.cerrar();
  }
  if (!documentoId) return null;
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={cerrar}
      titulo="Enviar a firma"
      acciones={
        <>
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || nombre.trim().length < 2}
            onClick={async () => {
              const r = await ejecutar(
                "core.firmas.enviar",
                {
                  documentoId,
                  clase,
                  nivel,
                  orden,
                  ...(mensaje.trim() ? { mensaje: mensaje.trim() } : {}),
                  firmantes: [{ tipo, nombre: nombre.trim(), email: email.trim() || null }],
                },
                false,
                "ninguna",
              );
              if (r) {
                avisar.exito("Enviado a firma");
                cerrar();
              }
            }}
          >
            {pendiente ? "Enviando…" : "Enviar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <p className="t-caption text-danger-fg">{error}</p> : null}
        <Campo
          etiqueta="Documento"
          htmlFor="ef-clase"
          ayuda="El tipo de documento según la política de firma."
        >
          <Select id="ef-clase" opciones={CLASES} valor={clase} onCambiar={setClase} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Nivel" htmlFor="ef-nivel">
            <Select id="ef-nivel" opciones={NIVELES} valor={nivel} onCambiar={setNivel} />
          </Campo>
          <Campo etiqueta="Orden" htmlFor="ef-orden">
            <Select id="ef-orden" opciones={ORDENES} valor={orden} onCambiar={setOrden} />
          </Campo>
        </div>
        <Campo etiqueta="Tipo de firmante" htmlFor="ef-tipo">
          <Select id="ef-tipo" opciones={TIPOS_FIRMANTE} valor={tipo} onCambiar={setTipo} />
        </Campo>
        <Campo etiqueta="Nombre del firmante" htmlFor="ef-nombre">
          <Input
            id="ef-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo"
          />
        </Campo>
        <Campo
          etiqueta="Correo del firmante"
          htmlFor="ef-email"
          ayuda="Recibe el enlace personal de firma."
        >
          <Input
            id="ef-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.cl"
          />
        </Campo>
        <Campo etiqueta="Mensaje (opcional)" htmlFor="ef-mensaje">
          <Textarea id="ef-mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}
