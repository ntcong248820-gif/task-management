import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi } from 'vitest';

/**
 * Custom render function with providers
 */
export function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return render(ui, { ...options });
}

/**
 * Mock fetch responses
 */
export function mockFetch(data: any, status = 200) {
    global.fetch = vi.fn(() =>
        Promise.resolve({
            ok: status >= 200 && status < 300,
            status,
            json: () => Promise.resolve(data),
        } as Response)
    );
}

/**
 * Mock API response
 */
export function mockApiResponse(endpoint: string, data: any) {
    global.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.includes(endpoint)) {
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve(data),
            } as Response);
        }
        return Promise.reject(new Error('Not found'));
    });
}
