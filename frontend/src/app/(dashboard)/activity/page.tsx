'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ActivityLog } from '@/types';
import { formatRelativeTime, formatStatus, cn } from '@/lib/utils';
import { Activity as ActivityIcon, CheckSquare, User, Building2 } from 'lucide-react';

const ENTITY_ICONS: Record<string, any> = { TASK: CheckSquare, USER: User, ORGANIZATION: Building2 };
const ACTION_COLORS: Record<string, string> = {
  CREATE_TASK: 'text-emerald-500 bg-emerald-500/10',
  UPDATE_TASK: 'text-blue-500 bg-blue-500/10',
  DELETE_TASK: 'text-red-500 bg-red-500/10',
  CREATE_USER: 'text-purple-500 bg-purple-500/10',
  UPDATE_USER: 'text-amber-500 bg-amber-500/10',
  DEACTIVATE_USER: 'text-red-500 bg-red-500/10',
};

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

export default function ActivityPage() {
  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['activity'],
    queryFn: () => api.get('/activity-logs').then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : d.data || [];
    }),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Recent actions in your organization</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-[hsl(var(--muted))] animate-pulse-soft" />)}</div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-12 text-center">
          <ActivityIcon className="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))]" />
          <p className="mt-3 text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log, i) => {
            const Icon = ENTITY_ICONS[log.entityType] || ActivityIcon;
            const colors = ACTION_COLORS[log.action] || 'text-gray-500 bg-gray-500/10';
            return (
              <div key={log.id} className="flex items-start gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:bg-[hsl(var(--card)/0.8)]">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colors)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{formatAction(log.action)}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    {log.user && <span>{log.user.firstName} {log.user.lastName}</span>}
                    <span>•</span>
                    <span>{formatRelativeTime(log.createdAt)}</span>
                    {log.metadata && log.metadata.title && (
                      <><span>•</span><span className="truncate max-w-[200px]">{log.metadata.title}</span></>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
