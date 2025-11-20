import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary-dark active:scale-[0.98] dark:bg-primary-light dark:text-navy-900",
  secondary:
    "border border-gray-200 bg-white text-foreground shadow-sm hover:bg-gray-50 dark:border-navy-600 dark:bg-navy-700 dark:text-white dark:hover:bg-navy-600",
  outline:
    "border border-gray-300 text-secondary hover:bg-gray-50 dark:border-navy-600 dark:text-navy-200 dark:hover:bg-navy-700/60",
  ghost:
    "text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700",
  destructive:
    "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "rounded-lg px-3 py-1.5 text-xs",
  md: "rounded-xl px-4 py-2 text-sm",
  lg: "rounded-2xl px-6 py-3 text-base",
  icon: "h-10 w-10 rounded-xl p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", fullWidth, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";
