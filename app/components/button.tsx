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
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-neutral btn-outline",
  outline: "btn-outline",
  ghost: "btn-ghost",
  destructive: "btn-error",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
  icon: "btn-square",
};

const loaderSize: Record<ButtonSize, string> = {
  sm: "loading-xs",
  md: "loading-sm",
  lg: "loading-md",
  icon: "loading-sm",
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
    children,
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={clsx(
        "btn",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "btn-block",
        className
      )}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className={clsx("loading loading-spinner", loaderSize[size])}
        />
      )}
      {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = "Button";
