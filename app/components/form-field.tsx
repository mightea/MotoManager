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

  const fieldClassName = clsx(
    "block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500",
    error && "border-red-500 focus:border-red-500 focus:ring-red-500"
  );

  return (
    <div className={clsx("space-y-1.5", className)}>
      <label
        htmlFor={fieldId}
        className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-500">
            *
          </span>
        )}
      </label>

      {Component === "select" ? (
        <select
          id={fieldId}
          className={fieldClassName}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-required={required || undefined}
          required={required}
          {...(props as any)}
        >
          {children}
        </select>
      ) : Component === "textarea" ? (
        <textarea
          id={fieldId}
          className={fieldClassName}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-required={required || undefined}
          required={required}
          {...(props as any)}
        />
      ) : (
        <input
          id={fieldId}
          type={type}
          className={clsx(fieldClassName, type === "date" && "dark:[color-scheme:dark]")}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-required={required || undefined}
          required={required}
          {...(props as any)}
        />
      )}

      {error ? (
        <p id={errorId} className="text-xs font-medium text-red-500 animate-fade-in">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-secondary dark:text-navy-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
