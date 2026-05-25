'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ImpactWindowPickerProps {
  from: string | null;
  to: string | null;
  onApply: (from: string, to: string) => void;
}

function DateButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? parseISO(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 gap-1.5 text-xs', !value && 'text-muted-foreground')}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {value ? format(parseISO(value), 'MMM d, yyyy') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={d => {
            if (d) {
              onChange(format(d, 'yyyy-MM-dd'));
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function ImpactWindowPicker({ from, to, onApply }: ImpactWindowPickerProps) {
  const [localFrom, setLocalFrom] = useState<string | null>(from);
  const [localTo, setLocalTo] = useState<string | null>(to);

  // Sync picker display when parent updates via annotation click or Focus button
  useEffect(() => { setLocalFrom(from); }, [from]);
  useEffect(() => { setLocalTo(to); }, [to]);

  const canApply = !!localFrom && !!localTo && localFrom <= localTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Analyze window:</span>
      <DateButton label="From date" value={localFrom} onChange={setLocalFrom} />
      <span className="text-xs text-muted-foreground">→</span>
      <DateButton label="To date" value={localTo} onChange={setLocalTo} />
      <Button
        size="sm"
        className="h-8 text-xs"
        disabled={!canApply}
        onClick={() => canApply && onApply(localFrom!, localTo!)}
      >
        Apply
      </Button>
      {(localFrom || localTo) && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { setLocalFrom(null); setLocalTo(null); }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
