'use client'

import * as React from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  range?: DateRange;
  onRangeChange?: (range?: DateRange) => void;
}

export function DateRangePicker({ className, range, onRangeChange }: DateRangePickerProps) {

  const handleSelect = (selectedRange?: DateRange) => {
    onRangeChange?.(selectedRange);
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !range && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {
              range?.from ? (
                range.to ? (
                  <>
                    {format(range.from, 'LLL dd, y')} - {' '}
                    {format(range.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(range.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date</span>
              )
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={range?.from}
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
