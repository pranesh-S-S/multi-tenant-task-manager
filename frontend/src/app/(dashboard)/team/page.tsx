'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User, Role } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { getInitials, formatDate, cn } from '@/lib/utils';
import { UserPlus, Shield, ShieldOff, X, UserX, UserCheck, Briefcase, Pencil, ListTodo } from 'lucide-react';
import Link from 'next/link';

export default function TeamPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'ADMIN';
  const [showInvite, setShowInvite] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const qc = useQueryClient();

  const { data: members = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
  const titleMut = useMutation({
    mutationFn: ({ id, jobTitle }: { id: string; jobTitle: string }) => api.patch(`/users/${id}/role`, { jobTitle }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditingTitle(null); },
  });
  const deactivateMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
  const reactivateMut = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/reactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
  const inviteMut = useMutation({
    mutationFn: (d: any) => api.post('/users/invite', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowInvite(false); },
  });

  const activeMembers = members.filter(m => m.isActive);
  const deactivatedMembers = members.filter(m => !m.isActive);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{activeMembers.length} active · {deactivatedMembers.length} deactivated</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity">
            <UserPlus className="h-4 w-4" /> Invite Member
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[hsl(var(--muted))] animate-pulse-soft" />)}</div>
      ) : (
        <>
          {/* Active Members */}
          <div className="space-y-2">
            {activeMembers.map(member => (
              <div key={member.id} className="flex items-center gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:bg-[hsl(var(--card)/0.8)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-sm font-bold text-[hsl(var(--primary))]">
                  {getInitials(member.firstName, member.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{member.firstName} {member.lastName}</p>
                    {member.id === me?.id && <span className="rounded-full bg-[hsl(var(--primary)/0.1)] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--primary))]">You</span>}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{member.email}</p>
                  {/* Job Title */}
                  <div className="mt-0.5 flex items-center gap-1">
                    {editingTitle === member.id ? (
                      <form onSubmit={e => { e.preventDefault(); titleMut.mutate({ id: member.id, jobTitle: titleInput }); }} className="flex items-center gap-1">
                        <input type="text" value={titleInput} onChange={e => setTitleInput(e.target.value)} placeholder="e.g. Developer, Manager..."
                          className="h-6 w-36 rounded border border-[hsl(var(--input))] bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]" autoFocus />
                        <button type="submit" className="text-[10px] text-[hsl(var(--primary))] hover:underline">Save</button>
                        <button type="button" onClick={() => setEditingTitle(null)} className="text-[10px] text-[hsl(var(--muted-foreground))] hover:underline">Cancel</button>
                      </form>
                    ) : (
                      <>
                        {member.jobTitle ? (
                          <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                            <Briefcase className="h-3 w-3" /> {member.jobTitle}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))] italic">No job title</span>
                        )}
                        {isAdmin && (
                          <button onClick={() => { setEditingTitle(member.id); setTitleInput(member.jobTitle || ''); }}
                            className="ml-1 rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors" title="Edit job title">
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/tasks?memberId=${member.id}`} className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary)/0.1)] hover:text-[hsl(var(--primary))] transition-colors" title="View assigned & created tasks">
                    <ListTodo className="h-3 w-3" /> Tasks
                  </Link>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', member.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]')}>
                    {member.role}
                  </span>
                </div>
                {isAdmin && member.id !== me?.id && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => roleMut.mutate({ id: member.id, role: member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN' })}
                      className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-colors" title={member.role === 'ADMIN' ? 'Demote to Member' : 'Promote to Admin'}>
                      {member.role === 'ADMIN' ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    </button>
                    <button onClick={() => { if (confirm(`Deactivate ${member.firstName}?`)) deactivateMut.mutate(member.id); }}
                      className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Deactivate">
                      <UserX className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Deactivated Members */}
          {deactivatedMembers.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Deactivated Members</h2>
              {deactivatedMembers.map(member => (
                <div key={member.id} className="flex items-center gap-4 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/0.5)] p-4 opacity-70">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    {getInitials(member.firstName, member.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium line-through">{member.firstName} {member.lastName}</p>
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500">Deactivated</span>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{member.email}</p>
                    {member.jobTitle && (
                      <span className="flex items-center gap-1 mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                        <Briefcase className="h-3 w-3" /> {member.jobTitle}
                      </span>
                    )}
                  </div>
                  <Link href={`/tasks?memberId=${member.id}`} className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary)/0.1)] hover:text-[hsl(var(--primary))] transition-colors">
                    <ListTodo className="h-3 w-3" /> Tasks
                  </Link>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]')}>
                    {member.role}
                  </span>
                  {isAdmin && (
                    <button onClick={() => { if (confirm(`Reactivate ${member.firstName}?`)) reactivateMut.mutate(member.id); }}
                      disabled={reactivateMut.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-500/10 dark:border-emerald-800 dark:text-emerald-400 transition-colors disabled:opacity-50"
                      title="Reactivate member">
                      <UserCheck className="h-4 w-4" /> Reactivate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onSubmit={d => inviteMut.mutate(d)} isLoading={inviteMut.isPending} error={inviteMut.error} />
      )}
    </div>
  );
}

function InviteModal({ onClose, onSubmit, isLoading, error }: { onClose: () => void; onSubmit: (d: any) => void; isLoading: boolean; error: any }) {
  const [f, setF] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'MEMBER' as Role, jobTitle: '' });
  const inp = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-fade-in w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Invite Member</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-[hsl(var(--muted))]"><X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" /></button>
        </div>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{(error as any)?.response?.data?.message || 'Failed'}</div>}
        <form onSubmit={e => { e.preventDefault(); onSubmit({ ...f, jobTitle: f.jobTitle || undefined }); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm font-medium">First name</label><input type="text" value={f.firstName} onChange={e => setF({ ...f, firstName: e.target.value })} required className={inp} /></div>
            <div><label className="mb-1 block text-sm font-medium">Last name</label><input type="text" value={f.lastName} onChange={e => setF({ ...f, lastName: e.target.value })} required className={inp} /></div>
          </div>
          <div><label className="mb-1 block text-sm font-medium">Email</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required className={inp} /></div>
          <div><label className="mb-1 block text-sm font-medium">Temporary Password</label><input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required minLength={8} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm font-medium">Role</label>
              <select value={f.role} onChange={e => setF({ ...f, role: e.target.value as Role })} className={inp}>
                <option value="MEMBER">Member</option><option value="ADMIN">Admin</option>
              </select>
            </div>
            <div><label className="mb-1 block text-sm font-medium">Job Title <span className="text-[10px] text-[hsl(var(--muted-foreground))]">(optional)</span></label>
              <input type="text" value={f.jobTitle} onChange={e => setF({ ...f, jobTitle: e.target.value })} placeholder="e.g. Developer" className={inp} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--secondary))]">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50">{isLoading ? 'Inviting...' : 'Invite'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
