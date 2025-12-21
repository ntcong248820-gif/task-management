import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KPICard } from './KPICard';
import { TrendingUp } from 'lucide-react';

describe('KPICard', () => {
    it('renders title and value', () => {
        render(
            <KPICard
                title="Total Clicks"
                value="12.5K"
                icon={TrendingUp}
                subtext="from organic search"
            />
        );

        expect(screen.getByText('Total Clicks')).toBeInTheDocument();
        expect(screen.getByText('12.5K')).toBeInTheDocument();
        expect(screen.getByText('from organic search')).toBeInTheDocument();
    });

    it('shows positive trend indicator', () => {
        render(
            <KPICard
                title="Growth"
                value="25%"
                icon={TrendingUp}
                trend={15}
                subtext="vs last month"
            />
        );

        // Check that trend percentage is displayed
        expect(screen.getByText('15%')).toBeInTheDocument();
        // Check that we have the trend value displayed
        expect(screen.getByText('vs last month')).toBeInTheDocument();
    });

    it('shows negative trend indicator', () => {
        render(
            <KPICard
                title="Position"
                value="4.2"
                icon={TrendingUp}
                trend={-10}
                subtext="avg position"
            />
        );

        // Check that absolute trend percentage is displayed
        expect(screen.getByText('10%')).toBeInTheDocument();
        expect(screen.getByText('avg position')).toBeInTheDocument();
    });

    it('renders without trend when not provided', () => {
        const { container } = render(
            <KPICard
                title="Tasks"
                value="42"
                icon={TrendingUp}
                subtext="completed"
            />
        );

        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('completed')).toBeInTheDocument();
        // Should not have ArrowUpRight or ArrowDownRight icons for trend
        expect(container.querySelector('svg[class*="mr-1"]')).not.toBeInTheDocument();
    });

    it('renders custom colorClass', () => {
        const { container } = render(
            <KPICard
                title="Custom"
                value="100"
                icon={TrendingUp}
                subtext="test"
                colorClass="text-blue-500"
            />
        );

        // Icon should have the custom color class
        const icon = container.querySelector('svg.text-blue-500');
        expect(icon).toBeInTheDocument();
    });
});
