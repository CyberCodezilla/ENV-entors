'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { getCognitoLoginUrl } from '@/lib/auth/cognito';
import { ShieldAlert, ShieldCheck, LogOut, Key } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function ModeratorGate() {
  const { auth, setAuth } = useAppStore();
  const { toast } = useToast();

  function handleSignIn() {
    window.location.href = getCognitoLoginUrl();
  }

  function handleSignOut() {
    setAuth(null, false);
    localStorage.removeItem('heatflood_id_token');
    toast({
      variant: 'info',
      message: 'Signed out from Moderator session.',
    });
  }

  // Demo toggle for judges to test moderator actions locally without Cognito login
  function handleToggleDemoModerator() {
    if (auth.isModerator) {
      setAuth(null, false);
      toast({ variant: 'info', message: 'Demo Moderator session ended.' });
    } else {
      setAuth('mock-demo-moderator-token', true);
      toast({
        variant: 'success',
        message: 'Demo Moderator mode enabled! You can now verify or reject incidents.',
      });
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {auth.isModerator ? (
        <div className="glass-panel px-2.5 py-1 rounded-md flex items-center gap-2 border border-conf-good/40 text-xs font-mono text-conf-good shadow-glass">
          <ShieldCheck className="w-3.5 h-3.5 text-conf-good" />
          <span>Moderator Active</span>
          <button
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out of moderator mode"
            className="text-ink-3 hover:text-white ml-1 p-0.5"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleToggleDemoModerator}
          title="Toggle Moderator Controls"
          className="glass-panel px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs font-mono text-ink-3 hover:text-ink hover:border-line-strong transition shadow-glass"
        >
          <Key className="w-3 h-3 text-heat" />
          <span>Mod Access</span>
        </button>
      )}
    </div>
  );
}