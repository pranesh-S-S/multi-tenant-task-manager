'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Task, User } from '@/types';
import { formatDate, formatStatus, cn } from '@/lib/utils';
import { ArrowLeft, Trash2, Calendar, UserIcon } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  
  const { data: task, isLoading } = useQuery<Task>({ queryKey: ['task', id], queryFn: () => api.get(`/tasks/${id}`).then(r => r.data) });
  const { data: members } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });
  
  const deleteMut = useMutation({ mutationFn: () => api.delete(`/tasks/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); router.push('/tasks'); } });
  const updateMut = useMutation({ mutationFn: (d: any) => api.patch(`/tasks/${id}`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ['task', id] }) });

  const [desc, setDesc] = useState('');
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  useEffect(() => {
    if (task?.description) setDesc(task.description);
  }, [task?.description]);

  if (isLoading) return <div className="animate-pulse-soft h-64 rounded-xl bg-[hsl(var(--muted))]" />;
  if (!task) return <p className="text-center text-[hsl(var(--muted-foreground))]">Task not found</p>;

  const isAdmin = currentUser?.role === 'ADMIN';
  const isCreator = task.createdById === currentUser?.id;
  const isAssignee = task.assignees?.some(a => a.id === currentUser?.id) ?? false;
  const canEdit = isAdmin || isCreator || isAssignee;
  const canChangeAssignee = isAdmin; // Only admins can reassign
  const canEditDescription = isAdmin || isCreator; // Only admin or creator can edit desc

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-xl font-bold">{task.title}</h1>
          {(isAdmin || isCreator) && <button onClick={() => deleteMut.mutate()} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 className="h-4 w-4" /></button>}
        </div>
        <div className="mb-6">
          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Description {!canEditDescription && <span className="text-[10px] italic">(admin or creator only)</span>}</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            onBlur={() => { if (desc !== task.description) updateMut.mutate({ description: desc }) }}
            disabled={!canEditDescription}
            placeholder={canEditDescription ? "Add a more detailed description..." : "No description provided."}
            rows={4}
            className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm disabled:opacity-60 resize-y focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Status</label>
            <select value={task.status} onChange={e => updateMut.mutate({ status: e.target.value })} disabled={!canEdit}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm disabled:opacity-60">
              {['TODO','IN_PROGRESS','IN_REVIEW','DONE','CANCELLED'].map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Priority</label>
            <select value={task.priority} onChange={e => updateMut.mutate({ priority: e.target.value })} disabled={!canEdit}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm disabled:opacity-60">
              {['LOW','MEDIUM','HIGH','URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Assignees {!canChangeAssignee && <span className="text-[10px] italic">(admin only)</span>}</label>
            <button type="button" onClick={() => canChangeAssignee && setAssigneeDropdownOpen(!assigneeDropdownOpen)} 
              disabled={!canChangeAssignee}
              className="flex w-full items-center justify-between rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm disabled:opacity-60 text-left focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]">
              <span className="block truncate">
                {!task.assignees || task.assignees.length === 0 ? 'Unassigned' : `${task.assignees.length} selected`}
              </span>
              <span className="pointer-events-none flex items-center pr-1">
                <svg className="h-4 w-4 text-[hsl(var(--muted-foreground))]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" /></svg>
              </span>
            </button>
            {assigneeDropdownOpen && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md bg-[hsl(var(--card))] py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-[hsl(var(--border))]">
                {members?.map(m => {
                  const isChecked = task.assignees?.some(a => a.id === m.id) ?? false;
                  return (
                    <label key={m.id} className="relative flex cursor-pointer select-none items-center py-2 pl-3 pr-9 hover:bg-[hsl(var(--muted))]">
                      <input type="checkbox" className="mr-3 h-4 w-4 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                        checked={isChecked}
                        onChange={e => {
                          const currentIds = task.assignees?.map(a => a.id) || [];
                          const newIds = e.target.checked 
                            ? [...currentIds, m.id] 
                            : currentIds.filter(id => id !== m.id);
                          updateMut.mutate({ assigneeIds: newIds });
                        }}
                      />
                      <span className="block truncate text-sm">{m.firstName} {m.lastName}</span>
                    </label>
                  );
                })}
                {members?.length === 0 && <p className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">No members found</p>}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Due Date</label>
            <p className="flex items-center gap-2 text-sm py-2"><Calendar className="h-4 w-4" />{task.dueDate ? formatDate(task.dueDate) : 'No due date'}</p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-[hsl(var(--border))] flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
          <span>Created {formatDate(task.createdAt)}</span>
          {task.createdBy && <span>by {task.createdBy.firstName} {task.createdBy.lastName}</span>}
        </div>
      </div>
    </div>
  );
}
