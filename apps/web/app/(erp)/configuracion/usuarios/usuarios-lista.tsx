import { Avatar, Badge, type EstadoPantalla, Estado, Table, Td, Th, Tr } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { ETIQUETA_ROL } from "@/app/_components/portales";
import { haceCuanto } from "@/lib/fechas";
import { ETIQUETA_PORTAL } from "@/lib/formato";

import { Reenviar } from "./reenviar";

export type Miembro = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  portales: string[];
  estado: string;
};
export type Invitacion = {
  id: string;
  email: string;
  rol: string;
  portales: string[];
  estado: string;
  expiresAt: Date;
  createdAt: Date;
};

type Props = {
  state: EstadoPantalla;
  usuarios: Miembro[];
  invitaciones: Invitacion[];
  puedeGestionar: boolean;
};

const portales = (p: string[]) => p.map((x) => ETIQUETA_PORTAL[x] ?? x).join(" · ");
const dias = (d: Date) =>
  Math.max(1, Math.round((new Date(d).getTime() - Date.now()) / 86_400_000));

function Persona({ nombre, detalle }: { nombre: string; detalle: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar nombre={nombre} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-fg">{nombre}</span>
        <span className="t-caption truncate">{detalle}</span>
      </span>
    </span>
  );
}

/** Usuarios y permisos (23): miembros e invitaciones pendientes en una tabla; editar por `?editar=`. */
export function UsuariosLista({ state, usuarios, invitaciones, puedeGestionar }: Props) {
  return (
    <Estado state={state} variante="lista">
      <Table>
        <thead>
          <tr>
            <Th>Usuario</Th>
            <Th className="max-md:hidden">Rol</Th>
            <Th className="max-md:hidden">Portales</Th>
            <Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((m) => (
            <Tr key={m.id} className={puedeGestionar ? "relative cursor-pointer" : undefined}>
              <Td>
                {puedeGestionar ? (
                  <LinkNext href={`?editar=${m.id}`} className="after:absolute after:inset-0">
                    <Persona
                      nombre={m.nombre}
                      detalle={m.nombre === m.email ? "" : m.email}
                    />
                  </LinkNext>
                ) : (
                  <Persona nombre={m.nombre} detalle={m.nombre === m.email ? "" : m.email} />
                )}
              </Td>
              <Td className="max-md:hidden">{ETIQUETA_ROL[m.rol] ?? m.rol}</Td>
              <Td className="whitespace-normal max-md:hidden">{portales(m.portales)}</Td>
              <Td>
                <Badge tono={m.estado === "activa" ? "success" : "warning"}>
                  {m.estado === "activa" ? "Activo" : "Suspendido"}
                </Badge>
              </Td>
            </Tr>
          ))}
          {puedeGestionar
            ? invitaciones.map((i) => (
                <Tr key={i.id}>
                  <Td>
                    <Persona
                      nombre={i.email}
                      detalle={`Invitada ${haceCuanto(i.createdAt)} · vence en ${dias(i.expiresAt)} días`}
                    />
                  </Td>
                  <Td className="max-md:hidden">{ETIQUETA_ROL[i.rol] ?? i.rol}</Td>
                  <Td className="whitespace-normal max-md:hidden">{portales(i.portales)}</Td>
                  <Td>
                    <span className="flex items-center gap-1">
                      <Badge tono="warning">Pendiente</Badge>
                      <Reenviar i={i} />
                    </span>
                  </Td>
                </Tr>
              ))
            : null}
        </tbody>
      </Table>
    </Estado>
  );
}
