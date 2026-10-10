'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { isModeratorToken } from '@/lib/auth/cognito';
import { ShieldCheck } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setAuth } = useAppStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Cognito Implicit grant returns tokens in URL hash: #id_token=...&access_token=...
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');

    if (idToken) {
      const isMod = isModeratorToken(idToken);
      setAuth(idToken, isMod);
      localStorage.setItem('heatflood_id_token', idToken);
    }

    router.replace('/');
  }, [router, setAuth]);

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-void text-ink gap-3">
      <ShieldCheck className="w-8 h-8 text-flood animate-pulse" />
      <p className="font-mono text-xs text-ink-2">Verifying authentication session...</p>
    </div>
  );
}