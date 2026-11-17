import { Inbox, Search, Send } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client';
import { RequestCard } from '../components/RequestCard';
import { LinkButton } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingList } from '../components/ui/Skeleton';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/cn';
import type { ExchangeRequest, RequestStatus } from '../types';

type Tab = 'incoming' | 'outgoing';
type Filter = 'all' | RequestStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

export default function Requests() {
  usePageTitle('My Requests');
  const { data, error, loading, reload, setData } = useFetch(() => api.listRequests(), []);
  const [tab, setTab] = useState<Tab>('incoming');
  const [filter, setFilter] = useState<Filter>('all');

  const replace = (updated: ExchangeRequest) =>
    setData(
      (current) =>
        current && {
          incoming: current.incoming.map((r) => (r.id === updated.id ? updated : r)),
          outgoing: current.outgoing.map((r) => (r.id === updated.id ? updated : r)),
        },
    );

  const inTab = data?.[tab] ?? [];
  const visible = filter === 'all' ? inTab : inTab.filter((r) => r.status === filter);
  const count = (status: Filter) => (status === 'all' ? inTab.length : inTab.filter((r) => r.status === status).length);
  const pendingIncoming = data?.incoming.filter((r) => r.status === 'pending').length ?? 0;

  const tabs: { id: Tab; label: string; total?: number }[] = [
    { id: 'incoming', label: 'Received', total: data?.incoming.length },
    { id: 'outgoing', label: 'Sent', total: data?.outgoing.length },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My requests" subtitle="Accept or reject the requests you receive, and follow up on the ones you sent." />

      <div role="tablist" aria-label="Request direction" className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1">
        {tabs.map(({ id, label, total }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls="requests-panel"
            onClick={() => {
              setTab(id);
              setFilter('all');
            }}
            className={cn('flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors', tab === id ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900')}
          >
            {label}
            {total !== undefined && <span className="text-slate-500">{total}</span>}
            {id === 'incoming' && pendingIncoming > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{pendingIncoming} to answer</span>}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Filter by status" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {label}
            {data && <span className={cn('ml-1.5', filter === id ? 'text-brand-100' : 'text-slate-500')}>{count(id)}</span>}
          </button>
        ))}
      </div>

      <div id="requests-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {loading && !data ? (
          <LoadingList label="Loading requests…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : visible.length === 0 ? (
          inTab.length > 0 ? (
            <EmptyState icon={Inbox} title={`No ${filter} requests`}>
              Nothing here matches this filter.
            </EmptyState>
          ) : tab === 'incoming' ? (
            <EmptyState icon={Inbox} title="No requests received yet" action={<LinkButton to="/skills" variant="secondary">Review your skills</LinkButton>}>
              When another student asks to swap skills with you, you’ll be able to accept or reject it here. A complete skills list helps people find you.
            </EmptyState>
          ) : (
            <EmptyState icon={Send} title="You haven’t sent any requests" action={<LinkButton to="/discover" icon={Search}>Find a Learning Partner</LinkButton>}>
              Browse students who can teach what you want to learn and send your first request.
            </EmptyState>
          )
        ) : (
          <div className="space-y-4">
            {visible.map((r) => (
              <RequestCard key={r.id} request={r} direction={tab} onUpdated={replace} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
