import { cn } from "../cn";

/**
 * Códigos de respaldo de un solo uso. Se muestran una sola vez al enrolar el segundo factor; sirven
 * para entrar si se pierde el autenticador. Monoespaciados para leerlos y copiarlos sin confusión.
 */
export function CodigosRespaldo({ codigos, className }: { codigos: string[]; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-2 rounded-md bg-fill p-3", className)}>
      {codigos.map((c) => (
        <li key={c} className="text-center font-mono text-sm tracking-wide text-fg">
          {c}
        </li>
      ))}
    </ul>
  );
}
