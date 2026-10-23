"use client";

import { FormularioLogin } from "@/app/(auth)/login/formulario-login";
import { SelectorEmpresa } from "@/app/(auth)/elegir-empresa/selector-empresa";
import {
  Invitacion,
  type DatosInvitacion,
} from "@/app/(auth)/invitacion/[slug]/[token]/invitacion";
import { EnlaceVencido } from "@/app/(auth)/recuperar/enlace-vencido";
import { NuevaPassword } from "@/app/(auth)/recuperar/[token]/nueva-password";
import { PedirEnlace } from "@/app/(auth)/recuperar/pedir-enlace";

const inv: DatosInvitacion = {
  tenant: "Gard Security",
  email: "camila.soto@gard.cl",
  rol: "admin",
  estado: "pendiente",
  usuarioExiste: false,
  nombreUsuario: null,
  invitadoPor: "Paula Rojas",
  expiresAt: "2026-10-30T15:00:00Z",
  acceptedAt: null,
};
const t = { slug: "gard", token: "muestra" };

/** Variantes de las pantallas de acceso con datos ficticios (comparación con export-acceso). */
export const VARIANTES: Record<string, () => React.ReactNode> = {
  login: () => <FormularioLogin destino="/" google />,
  "login-error": () => (
    <FormularioLogin
      destino="/"
      google
      inicial={{
        tipo: "error",
        titulo: "El correo o la contraseña no coinciden",
        texto:
          "Revisa los datos y vuelve a intentarlo. Tras 5 intentos pausaremos el acceso por 15 minutos.",
      }}
    />
  ),
  "login-suspendida": () => (
    <FormularioLogin
      destino="/"
      google
      inicial={{
        tipo: "suspendida",
        texto:
          "No puedes entrar a Gard Security por ahora. Pide a Paula Rojas (administración de Gard Security) que reactive tu acceso.",
      }}
    />
  ),
  "login-cargando": () => <FormularioLogin destino="/" google cargando />,
  recuperar: () => <PedirEnlace />,
  "recuperar-enviado": () => <PedirEnlace enviadoA="carlos@gard.cl" />,
  "recuperar-nueva": () => <NuevaPassword token="muestra" correo="carlos@gard.cl" />,
  "recuperar-vencido": () => <EnlaceVencido />,
  "invitacion-sin-cuenta": () => <Invitacion {...t} datos={inv} sesion={null} />,
  "invitacion-con-cuenta": () => (
    <Invitacion
      {...t}
      datos={{ ...inv, usuarioExiste: true, nombreUsuario: "Camila Soto" }}
      sesion={null}
    />
  ),
  "invitacion-vencida": () => (
    <Invitacion
      {...t}
      datos={{ ...inv, estado: "vencida", expiresAt: "2026-10-16T15:00:00Z" }}
      sesion={null}
    />
  ),
  "invitacion-usada": () => (
    <Invitacion
      {...t}
      datos={{ ...inv, estado: "aceptada", acceptedAt: "2026-10-21T15:00:00Z" }}
      sesion={null}
    />
  ),
  "elegir-empresa": () => (
    <SelectorEmpresa
      destino="/"
      empresas={[
        {
          tenantId: "a",
          nombre: "Gard Security",
          rol: "admin",
          ultimoAcceso: "2026-10-22T15:00:00Z",
        },
        {
          tenantId: "b",
          nombre: "Atlas Seguridad",
          rol: "supervisor",
          ultimoAcceso: "2026-10-14T15:00:00Z",
        },
        { tenantId: "c", nombre: "Vigía Norte", rol: "gerente", ultimoAcceso: null },
      ]}
    />
  ),
};

export function Variante({ id }: { id: string }) {
  const render = VARIANTES[id];
  return render ? render() : <p className="p-4">Variantes: {Object.keys(VARIANTES).join(", ")}</p>;
}
