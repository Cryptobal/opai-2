import { PageHeader, Table, Td, Th, Tr } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario } from "@/lib/servidor";

export const metadata = { title: "Accesos de mandante y EST" };

type Item = { id: string; correo: string; tipo: string; estado: string; cuentaId: string };

export default function MandantesAsistencia() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Accesos mandante"
      ruta="/asistencia/mandantes"
      cargar={async () => ejecutarComoUsuario<{ items: Item[] }>("erp", "asistencia.mandante_accesos.listar", { tipo: "todos" })}
    >
      {(r) => (
        <div className="flex flex-col gap-4">
          <PageHeader eyebrow="Asistencia" title="Accesos de mandante y EST" subtitle="Solo lectura a instalaciones elegidas." />
          <Table etiqueta="Accesos activos y revocados">
            <thead>
              <Tr><Th>Correo</Th><Th>Tipo</Th><Th>Estado</Th><Th>Cuenta</Th></Tr>
            </thead>
            <tbody>
              {(r.ok ? r.data.items : []).map((a) => (
                <Tr key={a.id}>
                  <Td>{a.correo}</Td><Td>{a.tipo}</Td><Td>{a.estado}</Td><Td mono>{a.cuentaId.slice(0, 8)}…</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </PaginaPortal>
  );
}