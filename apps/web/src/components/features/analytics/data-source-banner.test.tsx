import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataSourceBanner } from './data-source-banner';
import { useIntegrationStatus } from '@/hooks/use-integrations-settings';

vi.mock('@/hooks/use-integrations-settings', async () => {
    const actual = await vi.importActual<typeof import('@/hooks/use-integrations-settings')>(
        '@/hooks/use-integrations-settings'
    );
    return { ...actual, useIntegrationStatus: vi.fn() };
});

const mockUseIntegrationStatus = vi.mocked(useIntegrationStatus);

describe('DataSourceBanner', () => {
    it('renders healthy GSC source with site label and sync time', () => {
        mockUseIntegrationStatus.mockReturnValue({
            status: {
                gsc: {
                    connected: true,
                    isActive: true,
                    siteUrl: 'https://example.com/',
                    healthState: 'healthy',
                    lastSync: '2026-01-01T00:00:00Z',
                },
                ga4: { connected: false },
            },
            loading: false,
            error: undefined,
            mutate: vi.fn(),
        } as ReturnType<typeof useIntegrationStatus>);

        render(<DataSourceBanner projectId="proj-1" />);

        expect(screen.getByText(/GSC:/)).toBeInTheDocument();
        expect(screen.getByText('https://example.com/')).toBeInTheDocument();
        expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('renders needs_reconnect badge for a stale/broken source', () => {
        mockUseIntegrationStatus.mockReturnValue({
            status: {
                gsc: { connected: false },
                ga4: {
                    connected: true,
                    isActive: true,
                    propertyName: 'My GA4 Property',
                    healthState: 'needs_reconnect',
                    lastSync: '2026-01-01T00:00:00Z',
                },
            },
            loading: false,
            error: undefined,
            mutate: vi.fn(),
        } as ReturnType<typeof useIntegrationStatus>);

        render(<DataSourceBanner projectId="proj-1" />);

        expect(screen.getByText(/GA4:/)).toBeInTheDocument();
        expect(screen.getByText('My GA4 Property')).toBeInTheDocument();
        expect(screen.getByText('Needs reconnect')).toBeInTheDocument();
    });

    it('renders error badge for a failing source', () => {
        mockUseIntegrationStatus.mockReturnValue({
            status: {
                gsc: {
                    connected: true,
                    isActive: true,
                    siteUrl: 'https://example.com/',
                    healthState: 'error',
                },
                ga4: { connected: false },
            },
            loading: false,
            error: undefined,
            mutate: vi.fn(),
        } as ReturnType<typeof useIntegrationStatus>);

        render(<DataSourceBanner projectId="proj-1" />);

        expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('renders nothing while loading', () => {
        mockUseIntegrationStatus.mockReturnValue({
            status: undefined,
            loading: true,
            error: undefined,
            mutate: vi.fn(),
        } as ReturnType<typeof useIntegrationStatus>);

        const { container } = render(<DataSourceBanner projectId="proj-1" />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when no source is connected', () => {
        mockUseIntegrationStatus.mockReturnValue({
            status: { gsc: { connected: false }, ga4: { connected: false } },
            loading: false,
            error: undefined,
            mutate: vi.fn(),
        } as ReturnType<typeof useIntegrationStatus>);

        const { container } = render(<DataSourceBanner projectId="proj-1" />);
        expect(container.firstChild).toBeNull();
    });

    it('excludes a connected-but-inactive source (legacy/non-selected)', () => {
        mockUseIntegrationStatus.mockReturnValue({
            status: {
                gsc: {
                    connected: true,
                    isActive: false,
                    siteUrl: 'https://old-site.example.com/',
                    healthState: 'stale',
                },
                ga4: { connected: false },
            },
            loading: false,
            error: undefined,
            mutate: vi.fn(),
        } as ReturnType<typeof useIntegrationStatus>);

        const { container } = render(<DataSourceBanner projectId="proj-1" />);
        expect(container.firstChild).toBeNull();
        expect(screen.queryByText('https://old-site.example.com/')).not.toBeInTheDocument();
    });
});
