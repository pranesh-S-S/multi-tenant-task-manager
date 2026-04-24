'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Task, PaginatedResponse, User, TaskStatus, TaskPriority } from '@/types';
import { formatStatus, formatRelativeTime, cn } from '@/lib/utils';
import { Plus, Search, LayoutList, Kanban, X } from 'lucide-react';
import Link from 'next/link';

const STATUS_OPTIONS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];
const PRIORITY_OPTIONS: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  IN_REVIEW: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  DONE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  CANCELLED: 'bg-gray-500/10 text-gray-500',
};
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  MEDIUM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  HIGH: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  URGENT: 'bg-red-500/10 text-red-600 dark:text-red-400',
};
const KANBAN_COLS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'TODO', label: 'To Do', color: 'border-t-blue-500' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-t-amber-500' },
  { status: 'IN_REVIEW', label: 'In Review', color: 'border-t-purple-500' },
  { status: 'DONE', label: 'Done', color: 'border-t-emerald-500' },
];

import { useSearchParams } from 'next/navigation';

export default function TasksPage() {
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');

  const { data, isLoading } = useQuery<PaginatedResponse<Task>>({
    queryKey: ['tasks', { page, memberId }],
    queryFn: () => api.get(`/tasks?page=${page}&limit=20${memberId ? `&memberId=${memberId}` : ''}`).then(r => r.data),
  });
  const { data: members } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });
  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/tasks', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowCreate(false); },
    onError: (err: any) => alert(err.response?.data?.message || 'Error creating task'),
  });
  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => api.patch(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Error updating task'),
  });

  const tasks = data?.data || [];
  const meta = data?.meta;
  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  const inp = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)] transition-colors';

  const member = memberId && members ? members.find(m => m.id === memberId) : null;
  const pageTitle = member ? `Tasks for ${member.firstName}` : 'Tasks';

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{meta?.total || 0} total</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className={cn(inp, 'pl-9')} />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
          {(['list', 'kanban'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === v ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))]')}>
              {v === 'list' ? <LayoutList className="h-4 w-4" /> : <Kanban className="h-4 w-4" />}
              {v === 'list' ? 'List' : 'Board'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[hsl(var(--muted))] animate-pulse-soft" />)}</div>
      ) : view === 'list' ? (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
              {search ? 'No tasks match your search' : 'No tasks yet'}
            </div>
          ) : filtered.map(task => (
            <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-all hover:shadow-md hover:border-[hsl(var(--primary)/0.3)]">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{task.title}</p>
                {task.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {task.description}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[task.status])}>{formatStatus(task.status)}</span>
                  {task.status !== 'DONE' && task.status !== 'CANCELLED' && (
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                  )}
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatRelativeTime(task.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {task.createdBy && <span className="text-xs text-[hsl(var(--muted-foreground))]">Created by {task.createdBy.firstName}</span>}
                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex -space-x-2 overflow-hidden">
                    {task.assignees.map(a => (
                      <span key={a.id} className="inline-block h-6 w-6 rounded-full bg-[hsl(var(--secondary))] text-center text-[10px] font-medium leading-6 ring-2 ring-[hsl(var(--card))]" title={a.firstName}>{a.firstName.charAt(0)}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-[hsl(var(--secondary))]">Previous</button>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">Page {page} of {meta.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-[hsl(var(--secondary))]">Next</button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KANBAN_COLS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.status);
            return (
              <div key={col.status} className={cn('rounded-xl border border-[hsl(var(--border))] border-t-4 bg-[hsl(var(--card)/0.5)] p-3', col.color)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { const id = e.dataTransfer.getData('taskId'); if (id) updateStatusMut.mutate({ id, status: col.status }); }}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--muted))] px-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(task => (
                    <Link key={task.id} href={`/tasks/${task.id}`} draggable onDragStart={e => e.dataTransfer.setData('taskId', task.id)}
                      className="block rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-all hover:shadow-md cursor-grab active:cursor-grabbing">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {task.status !== 'DONE' && task.status !== 'CANCELLED' && (
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                        )}
                        <div className="flex-1"></div>
                        {task.assignees && task.assignees.length > 0 && (
                          <div className="flex -space-x-1 overflow-hidden">
                            {task.assignees.map(a => (
                              <span key={a.id} className="inline-block h-5 w-5 rounded-full bg-[hsl(var(--secondary))] text-center text-[8px] font-medium leading-5 ring-1 ring-[hsl(var(--card))]" title={a.firstName}>{a.firstName.charAt(0)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  {colTasks.length === 0 && <p className="py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">Drop tasks here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateTaskModal members={members || []} onClose={() => setShowCreate(false)} onSubmit={d => createMut.mutate(d)} isLoading={createMut.isPending} />}
    </div>
  );
}

function CreateTaskModal({ members, onClose, onSubmit, isLoading }: { members: User[]; onClose: () => void; onSubmit: (d: any) => void; isLoading: boolean }) {
  const [f, setF] = useState({ title: '', description: '', priority: 'MEDIUM' as TaskPriority, status: 'TODO' as TaskStatus, assigneeIds: [] as string[], dueDate: '', assigneeDropdownOpen: false });
  const inp = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-fade-in w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl mx-4">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Create Task</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-[hsl(var(--muted))]"><X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); const { assigneeDropdownOpen, ...payload } = f; onSubmit({ ...payload, assigneeIds: f.assigneeIds.length > 0 ? f.assigneeIds : undefined, dueDate: f.dueDate || undefined }); }} className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium">Title</label><input type="text" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required placeholder="Task title" className={inp} /></div>
          <div><label className="mb-1 block text-sm font-medium">Description</label><textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Optional..." rows={3} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm font-medium">Priority</label><select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as TaskPriority })} className={inp}>{PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div>
              <label className="mb-1 block text-sm font-medium">Assignees</label>
              <div className="relative">
                <button type="button" onClick={() => setF(prev => ({ ...prev, assigneeDropdownOpen: !prev.assigneeDropdownOpen }))} 
                  className={cn(inp, 'flex items-center justify-between text-left')}>
                  <span className="block truncate">
                    {f.assigneeIds.length === 0 ? 'Unassigned' : `${f.assigneeIds.length} selected`}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" /></svg>
                  </span>
                </button>
                {f.assigneeDropdownOpen && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md bg-[hsl(var(--card))] py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-[hsl(var(--border))]">
                    {members.map(m => (
                      <label key={m.id} className="relative flex cursor-pointer select-none items-center py-2 pl-3 pr-9 hover:bg-[hsl(var(--muted))]">
                        <input type="checkbox" className="mr-3 h-4 w-4 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                          checked={f.assigneeIds.includes(m.id)}
                          onChange={e => {
                            if (e.target.checked) setF({ ...f, assigneeIds: [...f.assigneeIds, m.id] });
                            else setF({ ...f, assigneeIds: f.assigneeIds.filter(id => id !== m.id) });
                          }}
                        />
                        <span className="block truncate text-sm">{m.firstName} {m.lastName}</span>
                      </label>
                    ))}
                    {members.length === 0 && <p className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">No members found</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div><label className="mb-1 block text-sm font-medium">Due Date</label><input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} className={inp} /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--secondary))]">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50">{isLoading ? 'Creating...' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
