type Props = { respaldoId: string; usuarios: { userId: string; nombre: string }[] };

export function NotaRespaldo({ respaldoId, usuarios }: Props) {
  const nombre = respaldoId ? (usuarios.find((u) => u.userId === respaldoId)?.nombre ?? "persona asignada") : "";
  return (
    <p className="t-caption text-fg-muted">
      El responsable de respaldo se define en Configuración → Central{respaldoId ? ` (actual: ${nombre})` : ""}.
    </p>
  );
}