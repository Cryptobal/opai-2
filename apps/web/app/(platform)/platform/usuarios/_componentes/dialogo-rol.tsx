"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { Alerta, avisar, Button, Campo, Dialog, Input, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { ROL_PLATAFORMA } from "./usuarios-plataforma";

export type Objetivo = { email: string; nombre: string | null; rol: "owner" | "support" | null };
type Vista = { nombre: string | null; anterior: "owner" | "support" | null };

const OPCIONES = [
  { valor: "owner", etiqueta: ROL_PLATAFORMA["owner"] ?? "Owner" },
  { valor: "support", etiqueta: ROL_PLATAFORMA["support"] ?? "Soporte" },
  { valor: "ninguno", etiqueta: "Quitar el rol de plataforma" },
];
const texto = (r: string | null) => (r ? (ROL_PLATAFORMA[r] ?? r) : "sin rol");

/**
 * Cambio de rol de plataforma en dos pasos (CAR-323): primero «Revisar» (vista previa, no guarda) y
 * después «Confirmar». La capacidad impide cambiar el rol propio y quitar el último owner.
 */
export function DialogoRol({ objetivo, onCerrar }: { objetivo: Objetivo; onCerrar: () => void }) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [email, setEmail] = useState(objetivo.email);
  const [rol, setRol] = useState<string>(objetivo.rol ?? "support");
  const [vista, setVista] = useState<Vista | null>(null);
  const input = { email: email.trim(), platformRole: rol === "ninguno" ? null : rol };

  async function revisar() {
    const r = await ejecutar<Vista>("platform.users.set_role", input, true, "ninguna");
    if (r) setVista(r);
  }
  async function confirmar() {
    if (!(await ejecutar("platform.users.set_role", input))) return;
    avisar.exito("Rol de plataforma actualizado");
    router.refresh();
    onCerrar();
  }

  const limpiar = () => setVista(null);
  return (
    <Dialog
      abierto
      onCerrar={onCerrar}
      titulo={objetivo.nombre ? `Rol de ${objetivo.nombre}` : "Dar rol de plataforma"}
      descripcion="El owner administra todo OPAI; soporte solo puede mirar."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          {vista ? (
            <Button
              variant={rol === "ninguno" ? "destructive" : "primary"}
              disabled={pendiente}
              onClick={() => void confirmar()}
            >
              Confirmar
            </Button>
          ) : (
            <Button disabled={pendiente || !email.trim()} onClick={() => void revisar()}>
              Revisar
            </Button>
          )}
        </>
      }
    >
      <CamposRol
        error={error}
        conCorreo={!objetivo.nombre}
        email={email}
        rol={rol}
        onEmail={(v) => (limpiar(), setEmail(v))}
        onRol={(v) => (limpiar(), setRol(v))}
      >
        {vista ? <VistaRol vista={vista} email={input.email} rol={input.platformRole} /> : null}
      </CamposRol>
    </Dialog>
  );
}

function CamposRol(p: {
  error: string | null;
  conCorreo: boolean;
  email: string;
  rol: string;
  onEmail: (v: string) => void;
  onRol: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {p.error ? <Alerta tono="danger" titulo={p.error} /> : null}
      {p.conCorreo ? (
        <Campo
          etiqueta="Correo"
          htmlFor="rol-email"
          ayuda="Debe ser una cuenta que ya existe en OPAI."
        >
          <Input
            id="rol-email"
            type="email"
            value={p.email}
            onChange={(e) => p.onEmail(e.target.value)}
          />
        </Campo>
      ) : null}
      <Campo etiqueta="Rol" htmlFor="rol-plataforma">
        <Select
          id="rol-plataforma"
          aria-label="Rol"
          valor={p.rol}
          opciones={OPCIONES}
          onCambiar={p.onRol}
        />
      </Campo>
      {p.children}
    </div>
  );
}

function VistaRol(p: { vista: Vista; email: string; rol: string | null }) {
  return (
    <Alerta tono={p.rol === null ? "warning" : "info"} titulo="Revisa antes de confirmar">
      <p className="t-body-sm">
        {p.vista.nombre ?? p.email}: {texto(p.vista.anterior)} → <strong>{texto(p.rol)}</strong>
      </p>
    </Alerta>
  );
}
