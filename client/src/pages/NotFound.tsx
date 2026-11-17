import { Compass } from 'lucide-react';
import { LinkButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState icon={Compass} title="Page not found" action={<LinkButton to="/">Back to home</LinkButton>}>
        The page you’re looking for doesn’t exist or has moved.
      </EmptyState>
    </div>
  );
}
