import { useEffect, useState } from 'react';

import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { API_BASE } from '@/lib/sdk';

import { Loader2, Users, CheckCircle } from 'lucide-react';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [status, setStatus] = useState('waiting');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');
  const returnUrl = `/accept-invite?token=${encodeURIComponent(token || '')}`;

  useEffect(() => {
    if (!token || isLoadingAuth || !isAuthenticated || !user) return;

    const acceptInvitation = async () => {
      setStatus('loading');
      try {
        const response = await fetch(`${API_BASE}/workspace/accept-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to accept invitation');
        setStatus('success');
        setMessage(`You joined ${data.workspace.name}.`);
      } catch (error) {
        setStatus('error');
        setMessage(error.message);
      }
    };

    acceptInvitation();
  }, [token, isAuthenticated, isLoadingAuth, user]);

  if (isLoadingAuth || status === 'loading') {
    return <InvitationShell><Loader2 className="w-8 h-8 animate-spin text-primary" /></InvitationShell>;
  }

  if (!token) {
    return <InvitationShell><p className="text-destructive">This invitation link is missing its token.</p></InvitationShell>;
  }

  if (!isAuthenticated) {
    return (
      <InvitationShell>
        <Users className="w-10 h-10 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground">You have a workspace invitation</h1>
        <p className="text-muted-foreground mt-2">Log in or create an account with the invited email address to join.</p>
        <div className="flex justify-center gap-3 mt-6">
          <Link className="px-4 py-2 rounded-lg bg-primary text-primary-foreground" to={`/login?redirect=${encodeURIComponent(returnUrl)}`}>Log in</Link>
          <Link className="px-4 py-2 rounded-lg border border-border" to={`/register?redirect=${encodeURIComponent(returnUrl)}`}>Create account</Link>
        </div>
      </InvitationShell>
    );
  }

  if (status === 'success') {
    return <InvitationShell><CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" /><h1 className="text-2xl font-bold text-foreground">Invitation accepted</h1><p className="text-muted-foreground mt-2">{message}</p><button className="mt-6 px-4 py-2 rounded-lg bg-primary text-primary-foreground" onClick={() => navigate('/team')}>Open workspace</button></InvitationShell>;
  }

  return <InvitationShell><h1 className="text-2xl font-bold text-foreground">Could not join workspace</h1><p className="text-destructive mt-2">{message}</p></InvitationShell>;
}

function InvitationShell({ children }) {
  return <main className="min-h-screen flex items-center justify-center bg-background p-6"><section className="w-full max-w-md text-center border border-border rounded-2xl bg-card p-8 shadow-sm">{children}</section></main>;
}