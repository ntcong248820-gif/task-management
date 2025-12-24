import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth Callback Handler
 * This route is deprecated - redirect directly to backend callback
 * Backend will handle token storage and redirect back to frontend
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('[Frontend Callback] Redirecting to backend callback...');

    // Decode state to determine integration type
    let integration = 'gsc'; // default
    try {
        if (state) {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            integration = stateData.integration || 'gsc';
        }
    } catch (err) {
        console.error('Failed to decode state:', err);
    }

    // Redirect to backend callback endpoint
    // Backend will handle token storage and redirect back to /dashboard/integrations with success/error
    const backendCallbackUrl = new URL(`/api/integrations/${integration}/callback`, process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    backendCallbackUrl.searchParams.set('code', code || '');
    backendCallbackUrl.searchParams.set('state', state || '');
    if (error) {
        backendCallbackUrl.searchParams.set('error', error);
    }

    console.log('[Frontend Callback] Redirecting to:', backendCallbackUrl.toString());

    // Redirect to backend - backend will handle everything and redirect back
    return NextResponse.redirect(backendCallbackUrl.toString());
}
