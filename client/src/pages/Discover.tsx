import { Search, SearchX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { StudentCard } from '../components/StudentCard';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { Input, Select } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingGrid } from '../components/ui/Skeleton';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/cn';

const PAGE_SIZE = 24;
type SortKey = 'match' | 'name';

export default function Discover() {
  usePageTitle('Discover');
  // The query and sort live in the URL, so searches can be bookmarked, shared and used with the back button.
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const sort: SortKey = params.get('sort') === 'name' ? 'name' : 'match';

  const [input, setInput] = useState(q);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const pushedQuery = useRef(q); // the last query this page wrote to the URL

  const updateParams = (change: (p: URLSearchParams) => void) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        change(next);
        return next;
      },
      { replace: true },
    );

  // URL -> input (back/forward, or a link such as /discover?q=guitar).
  useEffect(() => {
    if (q !== pushedQuery.current) {
      pushedQuery.current = q;
      setInput(q);
    }
  }, [q]);

  // Input -> URL, after a pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = input.trim();
      if (next === pushedQuery.current) return;
      pushedQuery.current = next;
      setLimit(PAGE_SIZE);
      updateParams((p) => (next ? p.set('q', next) : p.delete('q')));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const { data, error, loading, reload } = useFetch(() => api.listStudents(q, limit, sort), [q, limit, sort]);

  const clearSearch = () => {
    setInput('');
    pushedQuery.current = '';
    setLimit(PAGE_SIZE);
    updateParams((p) => p.delete('q'));
  };

  return (
    <div>
      <PageHeader title="Discover students" subtitle="Browse students by name or skill." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} aria-hidden />
          <Input
            type="search"
            className="pl-10 pr-10"
            placeholder="Search by name or skill, e.g. “guitar” or “Priya”"
            aria-label="Search students by name or skill"
            maxLength={50}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {input && (
            <button type="button" onClick={clearSearch} aria-label="Clear search" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700">
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
        <div className="sm:w-48">
          <Select
            aria-label="Sort students"
            value={sort}
            onChange={(e) => {
              setLimit(PAGE_SIZE);
              updateParams((p) => (e.target.value === 'name' ? p.set('sort', 'name') : p.delete('sort')));
            }}
          >
            <option value="match">Best match</option>
            <option value="name">Name (A–Z)</option>
          </Select>
        </div>
      </div>

      {loading && !data ? (
        <LoadingGrid label="Loading students…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data!.students.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={q ? 'No students found' : 'No other students yet'}
          action={
            q ? (
              <Button variant="secondary" onClick={clearSearch}>
                Clear search
              </Button>
            ) : undefined
          }
        >
          {q ? `Nothing matches “${q}”. Try a different name or skill.` : 'Invite your friends to join Skill Swap and they’ll show up here.'}
        </EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600" aria-live="polite">
            Showing {data!.students.length} of {data!.total} student{data!.total === 1 ? '' : 's'}
            {q && (
              <>
                {' '}
                for “<span className="font-medium text-slate-900">{q}</span>”
              </>
            )}
          </p>
          <div className={cn('grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3', loading && 'opacity-60')}>
            {data!.students.map((s) => (
              <StudentCard key={s.id} student={s} />
            ))}
          </div>
          {data!.students.length < data!.total && (
            <div className="mt-8 text-center">
              <Button variant="secondary" loading={loading} onClick={() => setLimit(limit + PAGE_SIZE)}>
                Load more students
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
