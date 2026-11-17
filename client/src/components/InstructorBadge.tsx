import { BadgeCheck } from 'lucide-react';
import { Badge } from './ui/Badge';

/** Shown only for students an admin has verified as instructors. */
export function InstructorBadge({ label = 'Verified instructor' }: { label?: string }) {
  return (
    <Badge tone="brand" icon={BadgeCheck}>
      {label}
    </Badge>
  );
}
