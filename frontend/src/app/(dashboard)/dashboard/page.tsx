'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import api from '@/lib/api';
import type { Task, PaginatedResponse } from '@/types';
import { formatStatus, formatRelativeTime } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: tasksData } = useQuery<PaginatedResponse<Task>>({
    queryKey: ['tasks', { page: 1, limit: 5 }],
    queryFn: () => api.get('/tasks?page=1&limit=5').then((r) => r.data),
  });

  const { data: allTasksData } = useQuery<PaginatedResponse<Task>>({
    queryKey: ['tasks', 'stats'],
    queryFn: () => api.get('/tasks?page=1&limit=1').then((r) => r.data),
  });

  const total = allTasksData?.meta.total || 0;
  const recentTasks = tasksData?.data || [];

  const stats = [
    {
      label: 'Total Tasks',
      value: total,
      icon: ListTodo,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'In Progress',
      value: recentTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Completed',
      value: recentTasks.filter((t) => t.status === 'DONE').length,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Urgent',
      value: recentTasks.filter((t) => t.priority === 'URGENT' && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          Welcome back, {user?.firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Here&apos;s what&apos;s happening with your tasks today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                {stat.label}
              </p>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-[hsl(var(--foreground))]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Tasks */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
            Recent Tasks
          </h2>
          <Link
            href="/tasks"
            className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Link>
        </div>

        {recentTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-12 text-center">
            <ListTodo className="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))]" />
            <p className="mt-3 text-sm font-medium text-[hsl(var(--foreground))]">
              No tasks yet
            </p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Create your first task to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-all hover:shadow-md hover:border-[hsl(var(--primary)/0.3)]"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {task.description}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3">
                    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
                      {formatStatus(task.status)}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {formatRelativeTime(task.createdAt)}
                    </span>
                  </div>
                </div>
                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex -space-x-1 overflow-hidden">
                    {task.assignees.map(a => (
                      <span key={a.id} className="inline-block h-6 w-6 rounded-full bg-[hsl(var(--secondary))] text-center text-[10px] font-medium leading-6 ring-2 ring-[hsl(var(--card))]" title={a.firstName}>{a.firstName.charAt(0)}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
