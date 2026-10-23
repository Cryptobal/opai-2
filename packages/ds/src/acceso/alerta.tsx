import { AlertTriangle, CheckCircle2, Info, Lock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../cn";

type Tono = "danger" | "warning" | "info" | "success";

const ESTILO: Record<Tono, string> = {
  danger: "bg-danger-muted text-danger-fg",
  warning: "bg-warning-muted text-warning-fg",
  info: "bg-info-muted text-info-fg",
  success: "bg-success-muted text-success-fg",
};
const ICONO: Record<Tono, LucideIcon> = {
  danger: AlertTriangle,
  warning: Lock,
  info: Info,
  success: CheckCircle2,
};

type AlertaProps = {
  tono: Tono;
  titulo: string;
  children?: ReactNode;
  icono?: LucideIcon;
  className?: string;
};

/** Caja de estado con icono (error de credenciales, cuenta suspendida…). El color significa estado. */
export function Alerta({ tono, titulo, children, icono, className }: AlertaProps) {
  const Icono = icono ?? ICONO[tono];
  return (
    <div
      role={tono === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md p-3", ESTILO[tono], className)}
    >
      <Icono className="mt-0.5 size-4 flex-none" aria-hidden />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{titulo}</p>
        {children ? <div className="mt-0.5">{children}</div> : null}
      </div>
    </div>
  );
}
