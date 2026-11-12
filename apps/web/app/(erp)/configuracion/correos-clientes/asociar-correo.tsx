"use client";

import { useCallback, useState } from "react";

import { avisar, Button, Campo, Combobox, Dialog, Select } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { type Opcion, opcionesDeCuenta } from "./opciones-cuenta";

const SIN_CONTACTO = "_ninguno";

/** Asocia a mano un correo «sin asignar» a una cuenta y, si se quiere, a un contacto (`core.correos.asociar`). */
export function AsociarCorreo(p: { correoId: string; asunto: string | null }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  const [cuentaId, setCuentaId] = useState("");
  const [contactoId, setContactoId] = useState(SIN_CONTACTO);
  const [cuentas, setCuentas] = useState<Opcion[]>([]);
  const [contactos, setContactos] = useState<Opcion[]>([]);
  const [negocioId, setNegocioId] = useState(SIN_CONTACTO);
  const [negocios, setNegocios] = useState<Opcion[]>([]);
  const buscar = useCallback(async (q: string) => {
    const r = await ejecutarCapacidad("erp", "core.cuentas.list", {
      q: q.trim() || undefined,
      limite: 20,
    }).catch(() => null);
    const opciones = r?.ok
      ? (r.data as { items: { id: string; nombre: string }[] }).items.map((c) => ({
          valor: c.id,
          etiqueta: c.nombre,
        }))
      : [];
    setCuentas((prev) => [
      ...prev,
      ...opciones.filter((o) => !prev.some((v) => v.valor === o.valor)),
    ]);
    return opciones;
  }, []);
  async function elegirCuenta(id: string) {
    setCuentaId(id);
    setContactoId(SIN_CONTACTO);
    setNegocioId(SIN_CONTACTO);
    setContactos([]);
    setNegocios([]);
    if (!id) return;
    const o = await opcionesDeCuenta(id);
    setContactos(o.contactos);
    setNegocios(o.negocios);
  }
  async function asociar() {
    const input = {
      correoId: p.correoId,
      cuentaId,
      ...(contactoId !== SIN_CONTACTO ? { contactoId } : {}),
      ...(negocioId !== SIN_CONTACTO ? { negocioId } : {}),
    };
    if (await ejecutar("core.correos.asociar", input)) {
      setAbierto(false);
      avisar.exito(negocioId !== SIN_CONTACTO ? "Correo asociado: ya aparece en la cuenta y en el negocio" : "Correo asociado: ya aparece en la ficha");
    }
  }
  const cerrar = () => {
    setAbierto(false);
    limpiarError();
  };
  return (
    <>
      <Button variant="secondary" onClick={() => setAbierto(true)}>
        Asociar a una cuenta
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={cerrar}
        titulo="Asociar correo"
        descripcion={
          p.asunto
            ? `«${p.asunto}» quedará en el historial de la cuenta elegida.`
            : "El correo quedará en el historial de la cuenta elegida."
        }
        acciones={
          <>
            <Button variant="ghost" onClick={cerrar}>
              Cancelar
            </Button>
            <Button disabled={pendiente || !cuentaId} onClick={() => void asociar()}>
              Asociar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Campo
            etiqueta="Cuenta"
            htmlFor={`asociar-cuenta-${p.correoId}`}
            ayuda="Busca por nombre, razón social o RUT."
          >
            <Combobox
              id={`asociar-cuenta-${p.correoId}`}
              valor={cuentaId}
              onCambiar={([v]) => void elegirCuenta(v ?? "")}
              opciones={cuentas}
              onBuscar={buscar}
              placeholder="Buscar cuenta"
              disabled={pendiente}
            />
          </Campo>
          <Campo etiqueta="Contacto (opcional)" htmlFor={`asociar-contacto-${p.correoId}`}>
            <Select
              id={`asociar-contacto-${p.correoId}`}
              valor={contactoId}
              onCambiar={setContactoId}
              opciones={[{ valor: SIN_CONTACTO, etiqueta: "Solo la cuenta" }, ...contactos]}
              disabled={pendiente || !cuentaId}
            />
          </Campo>
          <Campo etiqueta="Negocio (opcional)" htmlFor={`asociar-negocio-${p.correoId}`}>
            <Select
              id={`asociar-negocio-${p.correoId}`}
              valor={negocioId}
              onCambiar={setNegocioId}
              opciones={[{ valor: SIN_CONTACTO, etiqueta: "Sin negocio" }, ...negocios]}
              disabled={pendiente || !cuentaId}
            />
          </Campo>
          {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
        </div>
      </Dialog>
    </>
  );
}
