'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { subDays, subMonths, subYears } from 'date-fns';

export interface DateRange {
    from: Date;
    to: Date;
}

export type CompareMode = 'none' | 'previous_period' | 'previous_year' | 'custom';

export interface CompareState {
    enabled: boolean;
    mode: CompareMode;
    range?: DateRange;
}

interface DateContextType {
    dateRange: DateRange;
    compare: CompareState;
    presets: {
        last7Days: () => void;
        last28Days: () => void;
        last3Months: () => void;
        last12Months: () => void;
        setCustomRange: (range: DateRange) => void;
    };
    compareActions: {
        toggleCompare: (enabled: boolean) => void;
        setCompareMode: (mode: CompareMode) => void;
        setCustomCompareRange: (range: DateRange) => void;
    };
}

const DateContext = createContext<DateContextType | undefined>(undefined);

// Helper to get default range (Last 28 days)
const getDefaultRange = (): DateRange => {
    const today = new Date();
    return {
        from: subDays(today, 28),
        to: today,
    };
};

// Calculate comparison range based on mode and current range
const calculateCompareRange = (currentRange: DateRange, mode: CompareMode): DateRange | undefined => {
    if (mode === 'none' || mode === 'custom') return undefined; // Custom is set manually

    const { from, to } = currentRange;
    const duration = to.getTime() - from.getTime();

    if (mode === 'previous_period') {
        const newTo = new Date(from.getTime() - 24 * 60 * 60 * 1000); // 1 day before 'from'
        const newFrom = new Date(newTo.getTime() - duration);
        return { from: newFrom, to: newTo };
    }

    if (mode === 'previous_year') {
        return {
            from: subYears(from, 1),
            to: subYears(to, 1),
        };
    }

    return undefined;
};

export function DateProvider({ children }: { children: ReactNode }) {
    const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange());
    const [compare, setCompare] = useState<CompareState>({
        enabled: false,
        mode: 'previous_period',
        range: undefined,
    });

    // Automatically update compare range when main date range or mode changes
    useEffect(() => {
        if (compare.enabled && compare.mode !== 'custom') {
            const newCompareRange = calculateCompareRange(dateRange, compare.mode);
            setCompare(prev => ({ ...prev, range: newCompareRange }));
        }
    }, [dateRange, compare.enabled, compare.mode]);

    const presets = {
        last7Days: () => {
            const today = new Date();
            setDateRange({ from: subDays(today, 7), to: today });
        },
        last28Days: () => {
            const today = new Date();
            setDateRange({ from: subDays(today, 28), to: today });
        },
        last3Months: () => {
            const today = new Date();
            setDateRange({ from: subMonths(today, 3), to: today });
        },
        last12Months: () => {
            const today = new Date();
            setDateRange({ from: subMonths(today, 12), to: today });
        },
        setCustomRange: (range: DateRange) => {
            console.log('Setting custom range:', range);
            setDateRange(range);
        },
    };

    const compareActions = {
        toggleCompare: (enabled: boolean) => {
            setCompare(prev => ({ ...prev, enabled }));
        },
        setCompareMode: (mode: CompareMode) => {
            setCompare(prev => ({ ...prev, mode }));
        },
        setCustomCompareRange: (range: DateRange) => {
            setCompare(prev => ({ ...prev, range, mode: 'custom' }));
        },
    };

    return (
        <DateContext.Provider value={{ dateRange, compare, presets, compareActions }}>
            {children}
        </DateContext.Provider>
    );
}

export function useDateContext() {
    const context = useContext(DateContext);
    if (context === undefined) {
        throw new Error('useDateContext must be used within a DateProvider');
    }
    return context;
}
