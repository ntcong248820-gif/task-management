import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth Callback Handler
 * Receives callback from Google OAuth and forwards to backend API
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Log full callback URL for debugging
    console.log('[Frontend Callback] Full URL:', request.url);
    console.log('[Frontend Callback] Code:', code?.substring(0, 30) + '...');
    console.log('[Frontend Callback] State:', state?.substring(0, 50) + '...');

    // Decode state to determine integration type
    let integration = 'gsc'; // default
    try {
        if (state) {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            integration = stateData.integration || 'gsc';
            console.log('[Frontend Callback] Decoded integration:', integration);
        }
    } catch (err) {
        console.error('Failed to decode state:', err);
    }

    // Both GA4 and GSC now use the same callback flow
    console.log(`[Frontend Callback] ${integration.toUpperCase()} detected. Forwarding to backend.`);

    // Forward to backend API callback (legacy/GSC behavior)
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/integrations/${integration}/callback?code=${code}&state=${state}${error ? `&error=${error}` : ''}`;

    try {
        const response = await fetch(backendUrl);

        if (!response.ok) {
            return NextResponse.redirect(new URL(`/dashboard/integrations?${integration}=error`, request.url));
        }

        return NextResponse.redirect(new URL(`/dashboard/integrations?${integration}=success`, request.url));
    } catch (err) {
        console.error('OAuth callback error:', err);
        return NextResponse.redirect(new URL(`/dashboard/integrations?${integration}=error`, request.url));
    }
}
