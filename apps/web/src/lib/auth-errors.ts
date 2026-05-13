interface AuthErrorLike {
  message?: string;
  statusText?: string;
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const authError = error as AuthErrorLike;
    return authError.message || authError.statusText || fallback;
  }

  return fallback;
}
