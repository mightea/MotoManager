import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /**
   * When true, render the motorsport stripe underline on the button — used
   * for high-emphasis primary CTAs (FAB, sticky save buttons). Defaults to
   * false to keep most buttons calm.
   */
  stripe?: boolean;
};

const baseStyles =
  "relative inline-flex items-center justify-center gap-2 font-display uppercase tracking-wider rounded-sm motion-safe:transition-[transform,background,border-color,box-shadow] motion-safe:duration-150 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 disabled:opacity-50 disabled:cursor-not-allowed";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-content shadow-[0_6px_18px_-10px_rgba(0,138,201,0.7)] hover:shadow-[0_12px_28px_-14px_rgba(0,138,201,0.85)] hover:brightness-105",
  secondary:
    "border border-base-content/15 bg-base-100 text-base-content hover:border-base-content/30 hover:bg-base-200 dark:bg-navy-800 dark:hover:bg-navy-700",
  outline:
    "border border-primary/40 bg-transparent text-primary hover:bg-primary/10",
  ghost:
    "bg-transparent text-base-content/70 hover:bg-base-200 hover:text-base-content dark:hover:bg-navy-800",
  destructive:
    "bg-error text-error-content shadow-[0_6px_18px_-10px_rgba(220,38,38,0.65)] hover:brightness-110",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[11px] tracking-[0.12em]",
  md: "h-10 px-4 text-xs tracking-[0.12em]",
  lg: "h-12 px-5 text-sm tracking-[0.14em]",
  icon: "h-10 w-10 p-0",
};

const stripeOffsetBySize: Record<ButtonSize, string> = {
  sm: "inset-x-3 -bottom-px",
  md: "inset-x-4 -bottom-px",
  lg: "inset-x-5 -bottom-px",
  icon: "inset-x-2 -bottom-px",
};

const loaderSize: Record<ButtonSize, string> = {
  sm: "h-3 w-3 border-2",
  md: "h-3.5 w-3.5 border-2",
  lg: "h-4 w-4 border-2",
  icon: "h-3.5 w-3.5 border-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    fullWidth,
    isLoading = false,
    leftIcon,
    rightIcon,
    stripe = false,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className={clsx(
            "animate-spin rounded-full border-current border-t-transparent",
            loaderSize[size],
          )}
        />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      {stripe && (
        <span
          aria-hidden="true"
          className={clsx("motorsport-stripe absolute h-[3px]", stripeOffsetBySize[size])}
        />
      )}
    </button>
  );
});

Button.displayName = "Button";
