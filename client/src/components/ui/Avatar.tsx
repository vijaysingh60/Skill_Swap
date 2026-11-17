import { cn } from '../../lib/cn';

const tones = [
  'bg-pink-100 text-pink-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
];

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

// The same name always gets the same colour, so people are recognisable at a glance.
const toneFor = (name: string) => tones[[...name].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % tones.length]!;

/** Initials avatar. There are no profile pictures in the data model. */
export function Avatar({ name, size = 'md', className }: { name: string; size?: keyof typeof sizes; className?: string }) {
  return (
    <span aria-hidden className={cn('flex shrink-0 select-none items-center justify-center rounded-full font-semibold', sizes[size], toneFor(name), className)}>
      {initials(name)}
    </span>
  );
}
