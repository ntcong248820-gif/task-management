"use client"

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { getAuthErrorMessage } from '@/lib/auth-errors';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenParam = new URLSearchParams(window.location.search).get('token');
    if (tokenParam) setToken(tokenParam);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);

    if (result.error) {
      setError(getAuthErrorMessage(result.error, 'Unable to reset password'));
      return;
    }

    setUpdated(true);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>New password</CardTitle>
        <CardDescription>Finish account recovery</CardDescription>
      </CardHeader>
      <CardContent>
        {updated ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Password updated.</p>
            <Button asChild className="w-full">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={loading || !token}>
              {loading ? 'Saving...' : 'Save password'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
