import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
  type?: string;
  as?: "input" | "textarea" | "select";
  children?: ReactNode;
}

export function FormField({
  label,
  error,
  helperText,
  className,
  id,
  type = "text",
  as: Component = "input",
  required,
  children,
  ...props
}: FormFieldProps) {
  const reactId = useId();
  const fieldId = id || reactId;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  const baseFieldClass = "w-full bg-base-200 text-base-content";
  const errorClass = error ? "border-error focus:border-error focus:outline-error" : "";

  return (
    <div className={clsx("space-y-1.5", className)}>
      <label
        htmlFor={fieldId}
        className="block text-xs font-semibold uppercase tracking-wider text-base-content/60"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-error">
            *
          </span>
        )}
      </label>

      {Component === "select" ? (
        <select
          id={fieldId}
          className={clsx("select select-bordered", baseFieldClass, errorClass)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-required={required || undefined}
          required={required}
          {...(props as InputHTMLAttributes<HTMLSelectElement>)}
        >
          {children}
        </select>
      ) : Component === "textarea" ? (
        <textarea
          id={fieldId}
          className={clsx("textarea textarea-bordered", baseFieldClass, errorClass)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-required={required || undefined}
          required={required}
          {...(props as InputHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={fieldId}
          type={type}
          className={clsx("input input-bordered", baseFieldClass, errorClass)}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-required={required || undefined}
          required={required}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error ? (
        <p id={errorId} aria-live="polite" className="text-xs font-medium text-error animate-fade-in">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-base-content/60">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
