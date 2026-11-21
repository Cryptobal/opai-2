import { Cabecera, Table, Td, Th, Tr } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario } from "@/lib/servidor";

export const metadata = { title: "Auditoría fiscalizador" };

type Acceso = { correo: string; empleadorRut: string; via: string; detalle: string; cuando: string };

export default function AuditoriaFiscalizador() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Auditoría fiscalizador"
      ruta="/asistencia/auditoria-fiscalizador"
      cargar={async () => ejecutarComoUsuario<{ items: Acceso[] }>("erp", "asistencia.fiscalizacion_accesos.listar", { limite: 50 })}
    >
      {(r) => (
        <div className="flex flex-col gap-4">
          <Cabecera
            sobre="Asistencia"
            titulo="Auditoría de accesos del fiscalizador"
            subtitulo="Cada ingreso queda registrado y no se puede borrar."
          />
          <Table etiqueta="Accesos">
            <thead>
              <Tr><Th>Fecha</Th><Th>Correo</Th><Th>RUT</Th><Th>Vía</Th><Th>Detalle</Th></Tr>
            </thead>
            <tbody>
              {(r.ok ? r.data.items : []).map((a) => (
                <Tr key={`${a.cuando}-${a.correo}`}>
                  <Td>{a.cuando}</Td><Td>{a.correo}</Td><Td className="font-mono">{a.empleadorRut}</Td><Td>{a.via}</Td><Td>{a.detalle}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </PaginaPortal>
  );
}