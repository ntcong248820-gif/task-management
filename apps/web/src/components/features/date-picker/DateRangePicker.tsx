'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useDateContext } from '@/contexts/DateContext';
import { Badge } from '@/components/ui/badge';

export function DateRangePicker() {
    const { dateRange, compare, presets, compareActions } = useDateContext();
    const [tempDate, setTempDate] = React.useState<{ from: Date; to: Date } | undefined>(dateRange);
    const [isOpen, setIsOpen] = React.useState(false);

    // Sync temp state when opening
    React.useEffect(() => {
        if (isOpen) {
            setTempDate(dateRange);
        }
    }, [isOpen, dateRange]);

    const handleApply = () => {
        console.log('Applying date range:', tempDate);
        if (tempDate?.from && tempDate?.to) {
            presets.setCustomRange({ from: tempDate.from, to: tempDate.to });
            setIsOpen(false);
        } else {
            console.log('Cannot apply: Incomplete range', tempDate);
        }
    };

    const handlePresetSelect = (value: string) => {
        switch (value) {
            case '7d': presets.last7Days(); break;
            case '28d': presets.last28Days(); break;
            case '3m': presets.last3Months(); break;
            case '12m': presets.last12Months(); break;
        }
        setIsOpen(false);
    };

    return (
        <div className="flex items-center gap-2">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-fit justify-start text-left font-normal bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300",
                            !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                    {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                                    {format(dateRange.to, "MMM dd, yyyy")}
                                </>
                            ) : (
                                format(dateRange.from, "MMM dd, yyyy")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700" align="end">
                    <div className="flex border-b border-slate-800">
                        {/* Sidebar Presets */}
                        <div className="border-r border-slate-800 p-2 space-y-1 w-40 bg-slate-950/50">
                            <p className="text-xs font-semibold text-slate-500 mb-2 px-2 py-1">PRESETS</p>
                            {[
                                { label: 'Last 7 days', value: '7d' },
                                { label: 'Last 28 days', value: '28d' },
                                { label: 'Last 3 months', value: '3m' },
                                { label: 'Last 12 months', value: '12m' },
                            ].map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => handlePresetSelect(preset.value)}
                                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-800 text-slate-300 transition-colors flex items-center justify-between group"
                                >
                                    {preset.label}
                                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-slate-500" />
                                </button>
                            ))}
                        </div>

                        {/* Calendar Area */}
                        <div className="p-0">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={tempDate?.from}
                                selected={tempDate}
                                onSelect={(range: any) => {
                                    console.log('DateRangePicker onSelect:', range);
                                    setTempDate(range);
                                }}
                                numberOfMonths={2}
                                className="p-3 text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Compare Toggle Section */}
                    <div className="p-3 bg-slate-950/30 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="compare"
                                    checked={compare.enabled}
                                    onChange={(e) => compareActions.toggleCompare(e.target.checked)}
                                    className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                                />
                                <label
                                    htmlFor="compare"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300"
                                >
                                    Compare
                                </label>
                            </div>

                            {compare.enabled && (
                                <Select
                                    value={compare.mode}
                                    onValueChange={(val: any) => compareActions.setCompareMode(val)}
                                >
                                    <SelectTrigger className="h-8 w-[180px] bg-slate-800 border-slate-700 text-xs">
                                        <SelectValue placeholder="Select mode" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                                        <SelectItem value="previous_period">Previous period</SelectItem>
                                        <SelectItem value="previous_year">Previous year</SelectItem>
                                        {/* <SelectItem value="custom">Custom...</SelectItem> */}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleApply}
                                disabled={!tempDate?.from || !tempDate?.to}
                                className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {compare.enabled && compare.range && (
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 h-9 rounded-md px-3 font-normal">
                    vs {format(compare.range.from, "MMM dd")} - {format(compare.range.to, "MMM dd, yyyy")}
                </Badge>
            )}
        </div>
    );
}
