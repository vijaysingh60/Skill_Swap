import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const control =
  'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
const valid = 'border-slate-300 focus:border-brand-500 focus:ring-brand-100';
const invalidStyle = 'border-rose-400 focus:border-rose-500 focus:ring-rose-100';

interface Invalidable {
  invalid?: boolean;
}

/** Bare controls, for places that provide their own label (search boxes, inline pickers). */
export function Input({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & Invalidable) {
  return <input aria-invalid={invalid || undefined} className={cn(control, 'h-10', invalid ? invalidStyle : valid, className)} {...props} />;
}

export function Textarea({ invalid, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & Invalidable) {
  return <textarea aria-invalid={invalid || undefined} className={cn(control, 'py-2', invalid ? invalidStyle : valid, className)} {...props} />;
}

export function Select({ invalid, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & Invalidable) {
  return (
    <div className="relative">
      <select aria-invalid={invalid || undefined} className={cn(control, 'h-10 appearance-none pr-9', invalid ? invalidStyle : valid, className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} aria-hidden />
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
}

function FieldShell({ id, label, error, hint, children }: FieldProps & { children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const describedBy = ({ id, error, hint }: FieldProps) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

/** Labelled controls with the error/hint text wired up for screen readers. */
export function TextField({ id, label, error, hint, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <Input id={id} invalid={!!error} aria-describedby={describedBy({ id, label, error, hint })} {...props} />
    </FieldShell>
  );
}

export function PasswordField({ id, label, error, hint, ...props }: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <Input id={id} type={visible ? 'text' : 'password'} invalid={!!error} className="pr-11" aria-describedby={describedBy({ id, label, error, hint })} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    </FieldShell>
  );
}

export function TextAreaField({ id, label, error, hint, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <Textarea id={id} invalid={!!error} aria-describedby={describedBy({ id, label, error, hint })} {...props} />
    </FieldShell>
  );
}

export function SelectField({ id, label, error, hint, children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <Select id={id} invalid={!!error} aria-describedby={describedBy({ id, label, error, hint })} {...props}>
        {children}
      </Select>
    </FieldShell>
  );
}
