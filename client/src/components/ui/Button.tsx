import { LoaderCircle, type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-60';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-xs hover:bg-brand-700 active:bg-brand-800',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
  destructive: 'bg-rose-600 text-white shadow-xs hover:bg-rose-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

/** Class names for anything that should look like a button (links, anchors). */
export const buttonStyles = (variant: Variant = 'primary', size: Size = 'md') => cn(base, variants[variant], sizes[size]);

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
}

interface ButtonProps extends Common, ButtonHTMLAttributes<HTMLButtonElement> {
  /** Shows a spinner and blocks further clicks, which prevents duplicate submissions. */
  loading?: boolean;
}

export function Button({ variant, size, icon: Icon, loading, children, className, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonStyles(variant, size), className)} {...rest}>
      {loading ? <LoaderCircle className="animate-spin" size={16} aria-hidden /> : Icon && <Icon size={16} aria-hidden />}
      {children}
    </button>
  );
}

interface LinkButtonProps extends Common, LinkProps {}

export function LinkButton({ variant, size, icon: Icon, children, className, ...rest }: LinkButtonProps) {
  return (
    <Link className={cn(buttonStyles(variant, size), className)} {...rest}>
      {Icon && <Icon size={16} aria-hidden />}
      {children}
    </Link>
  );
}
