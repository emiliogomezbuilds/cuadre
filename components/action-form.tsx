"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/app/actions";

/** A form wired to a server action that shows its error or success message inline. */
export function ActionForm({
  action, children, submit, variant = "default", className, disabled,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children?: React.ReactNode;
  submit: string;
  variant?: "default" | "outline" | "destructive";
  className?: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className={className}>
      {children}
      <Button type="submit" variant={variant} disabled={pending || disabled} className="mt-3">
        {pending ? "Procesando…" : submit}
      </Button>
      {state.error && <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="mt-2 text-sm text-green-800">{state.ok}</p>}
    </form>
  );
}
