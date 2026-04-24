'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Session } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { User as UserIcon, Monitor, Trash2, LogOut, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<'profile' | 'sessions'>('profile');
  const qc = useQueryClient();

  // Profile update
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [saved, setSaved] = useState(false);
  const profileMut = useMutation({
    mutationFn: (d: any) => api.patch('/users/me', d),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  // Sessions
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: () => api.get('/auth/sessions').then(r => r.data),
    enabled: tab === 'sessions',
  });
  const revokeMut = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
  const logoutAllMut = useMutation({
    mutationFn: () => api.post('/auth/logout-all'),
    onSuccess: () => logout(),
  });

  const inp = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]';
  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: UserIcon },
    { id: 'sessions' as const, label: 'Sessions', icon: Monitor },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' ? (
        <div className="max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
          <form onSubmit={e => { e.preventDefault(); profileMut.mutate({ firstName, lastName }); }} className="space-y-4">
            <div><label className="mb-1 block text-sm font-medium">Email</label><input type="email" value={user?.email || ''} disabled className={inp + ' opacity-60'} /></div>
            <div><label className="mb-1 block text-sm font-medium">First Name</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inp} /></div>
            <div><label className="mb-1 block text-sm font-medium">Last Name</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inp} /></div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={profileMut.isPending} className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50">
                {profileMut.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              {saved && <span className="text-sm text-emerald-500">✓ Saved</span>}
            </div>
          </form>
          <div className="mt-6 pt-4 border-t border-[hsl(var(--border))]">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Role: <span className="font-medium">{user?.role}</span> · Joined {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Sessions</h2>
            <button onClick={() => { if (confirm('Logout from ALL devices?')) logoutAllMut.mutate(); }}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 dark:border-red-800 transition-colors">
              <LogOut className="h-4 w-4" /> Logout All Devices
            </button>
          </div>
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--secondary))]">
                  <Monitor className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.device ? s.device.substring(0, 60) : 'Unknown device'}</p>
                  <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    {s.ipAddress && <span>IP: {s.ipAddress}</span>}
                    <span>•</span>
                    <span>Created {formatRelativeTime(s.createdAt)}</span>
                  </div>
                </div>
                <button onClick={() => revokeMut.mutate(s.id)}
                  className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Revoke session">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-8">No active sessions</p>}
          </div>
        </div>
      )}
    </div>
  );
}
