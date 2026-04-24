'use client';
import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      router.replace('/login?error=no_token');
      return;
    }

    // Use the access token from the URL to fetch user profile and set session
    loginWithToken(accessToken)
      .then(() => {
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/login?error=oauth_failed');
      });
  }, [searchParams, router, loginWithToken]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-r-transparent"></div>
        <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Authenticating with Google...</p>
      </div>
    </div>
  );
}
