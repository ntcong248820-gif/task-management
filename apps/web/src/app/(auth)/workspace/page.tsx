"use client"

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient, useSession } from '@/lib/auth-client';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { createWorkspaceSlug } from '@/lib/workspace-slug';

export default function WorkspacePage() {
  const router = useRouter();
  const session = useSession();
  const organizations = authClient.useListOrganizations();
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [handledInvitation, setHandledInvitation] = useState(false);

  const organizationList = useMemo(() => organizations.data ?? [], [organizations.data]);

  useEffect(() => {
    if (!session.isPending && !session.data) {
      const redirect = `${window.location.pathname}${window.location.search}`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [router, session.data, session.isPending]);

  useEffect(() => {
    const pendingWorkspaceName = localStorage.getItem('pendingWorkspaceName');
    if (pendingWorkspaceName) setWorkspaceName(pendingWorkspaceName);
  }, []);

  useEffect(() => {
    const invitationId = new URLSearchParams(window.location.search).get('invitationId');
    if (!invitationId || handledInvitation || !session.data) return;

    setHandledInvitation(true);
    authClient.organization.acceptInvitation({ invitationId }).then((result) => {
      if (result.error) {
        setError(getAuthErrorMessage(result.error, 'Unable to accept invitation'));
        return;
      }
      setMessage('Invitation accepted');
    });
  }, [handledInvitation, session.data]);

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await authClient.organization.create({
      name: workspaceName,
      slug: createWorkspaceSlug(workspaceName),
    });

    if (result.error || !result.data) {
      setError(getAuthErrorMessage(result.error, 'Unable to create workspace'));
      setLoading(false);
      return;
    }

    const activeResult = await authClient.organization.setActive({ organizationId: result.data.id });
    if (activeResult.error) {
      setError(getAuthErrorMessage(activeResult.error, 'Unable to activate workspace'));
      setLoading(false);
      return;
    }

    localStorage.removeItem('pendingWorkspaceName');
    router.push('/dashboard');
  }

  async function selectWorkspace(organizationId: string) {
    setLoading(true);
    setError('');
    const result = await authClient.organization.setActive({ organizationId });
    setLoading(false);

    if (result.error) {
      setError(getAuthErrorMessage(result.error, 'Unable to select workspace'));
      return;
    }

    router.push('/dashboard');
  }

  if (session.isPending || organizations.isPending) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!session.data) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>Choose or create a workspace</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {organizationList.length > 0 ? (
          <div className="space-y-2">
            {organizationList.map((organization) => (
              <Button
                key={organization.id}
                className="h-auto w-full justify-between px-3 py-3"
                variant="outline"
                disabled={loading}
                onClick={() => selectWorkspace(organization.id)}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {organization.name}
                </span>
                <Check className="h-4 w-4" />
              </Button>
            ))}
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={createWorkspace}>
          <div className="space-y-2">
            <Label htmlFor="workspace">New workspace</Label>
            <Input id="workspace" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} required />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Create workspace'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
