import { Badge, SeccionTarjeta, Table, Td, Th, Tr } from "@opai/ds";

import { fechaHora } from "@/lib/formato";

import { etiquetaDe, GESTION } from "./tipos";

export type Regla = {
  clave: string;
  tabla: string;
  dias: number;
  gestion: string;
  descripcion: string;
};
export type Ejecucion = {
  id: string;
  tabla: string;
  accion: string;
  modo: string;
  origen: string;
  filas: number;
  creadoEn: string;
};

const ETIQUETA: Record<string, string> = {
  idempotencias: "Confirmaciones temporales",
  aprobaciones: "Aprobaciones de agentes",
  gasto_agente_mes: "Gasto de agentes",
  personas: "Personas (trabajadores)",
  contactos: "Contactos de clientes",
  envios: "Envíos de avisos",
  invitaciones: "Invitaciones",
  vinculos: "Vínculos laborales",
  sueldos: "Remuneraciones",
  cuentas: "Cuentas de clientes",
  representantes: "Representantes legales",
  usuarios: "Usuarios",
  sesiones: "Sesiones",
  credenciales: "Credenciales",
  intentos_login: "Intentos de ingreso",
  documentos: "Documentos",
  perfil_empresa: "Datos de la empresa",
  dpa: "Aceptaciones del DPA",
  auditoria: "Auditoría",
  consentimientos: "Consentimientos",
  solicitudes: "Solicitudes de titulares",
  retencion_registro: "Registro de retención",
  incidentes: "Incidentes",
};

/** Política por dato: quién la aplica, días vigentes del tenant y descripción para el RAT. */
export function TablaReglas({ reglas }: { reglas: Regla[] }) {
  return (
    <SeccionTarjeta titulo="Política por dato" sinRelleno>
      <ul>
        {reglas.map((r) => {
          const g = etiquetaDe(GESTION, r.gestion);
          return (
            <li
              key={r.clave}
              className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-medium text-fg">
                  {ETIQUETA[r.clave] ?? r.tabla}
                </span>
                <Badge tono={g.tono} punto={false}>
                  {g.etiqueta}
                </Badge>
                {r.gestion === "trabajo" || r.gestion === "pendiente" ? (
                  <span className="t-caption t-numeric">
                    {r.dias > 0 ? `${r.dias} días` : "apagada"}
                  </span>
                ) : null}
              </div>
              <p className="t-caption">{r.descripcion}</p>
            </li>
          );
        })}
      </ul>
    </SeccionTarjeta>
  );
}

/** Lo que hizo o simuló el trabajo diario (contadores, sin datos personales). */
export function TablaEjecuciones({ ejecuciones }: { ejecuciones: Ejecucion[] }) {
  if (!ejecuciones.length) return null;
  return (
    <SeccionTarjeta titulo="Últimas ejecuciones" sinRelleno>
      <Table>
        <thead>
          <tr>
            <Th>Cuándo</Th>
            <Th>Dato</Th>
            <Th>Modo</Th>
            <Th className="text-right">Filas</Th>
          </tr>
        </thead>
        <tbody>
          {ejecuciones.map((e) => (
            <Tr key={e.id}>
              <Td className="t-numeric">{fechaHora(e.creadoEn)}</Td>
              <Td>{e.tabla}</Td>
              <Td>
                {e.modo === "simulacion" ? (
                  <Badge punto={false}>Simulación</Badge>
                ) : (
                  <Badge tono="warning" punto={false}>
                    {e.origen === "titular" ? "A pedido" : "Aplicada"}
                  </Badge>
                )}
              </Td>
              <Td className="t-numeric text-right">{e.filas}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </SeccionTarjeta>
  );
}
