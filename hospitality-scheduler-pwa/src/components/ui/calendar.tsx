// === ui/calendar.tsx ===
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarProps {
  /** Selection mode - currently only "single" is supported */
  mode?: "single"
  /** The currently selected date (for single mode) */
  selected?: Date
  /** Callback when a date is selected */
  onSelect?: (date: Date | undefined) => void
  /** Function to determine if a date should be disabled */
  disabled?: (date: Date) => boolean
  /** Whether the calendar should receive focus when mounted */
  initialFocus?: boolean
  /** Additional CSS classes */
  className?: string
}

export function Calendar({
  mode = "single",
  selected,
  onSelect,
  disabled,
  initialFocus,
  className
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected || new Date()
  )
  const calendarRef = React.useRef<HTMLDivElement>(null)

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Handle initial focus
  React.useEffect(() => {
    if (initialFocus && calendarRef.current) {
      calendarRef.current.focus()
    }
  }, [initialFocus])

  const handleDateClick = (day: number) => {
    const newDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    )

    // Handle selection based on mode
    if (mode === "single") {
      // For single mode, always replace the selection with the new date
      onSelect?.(newDate)
    }
    // Future: Add support for "multiple" and "range" modes here
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selected) return

    const currentDay = selected.getDate()
    const currentMonthValue = selected.getMonth()
    const currentYear = selected.getFullYear()

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault()
        handleDateClick(Math.max(1, currentDay - 1))
        break
      case "ArrowRight":
        e.preventDefault()
        handleDateClick(Math.min(daysInMonth, currentDay + 1))
        break
      case "ArrowUp":
        e.preventDefault()
        handleDateClick(Math.max(1, currentDay - 7))
        break
      case "ArrowDown":
        e.preventDefault()
        handleDateClick(Math.min(daysInMonth, currentDay + 7))
        break
      case "PageUp":
        e.preventDefault()
        if (e.shiftKey) {
          // Previous year
          setCurrentMonth(new Date(currentYear - 1, currentMonthValue, 1))
        } else {
          // Previous month
          goToPreviousMonth()
        }
        break
      case "PageDown":
        e.preventDefault()
        if (e.shiftKey) {
          // Next year
          setCurrentMonth(new Date(currentYear + 1, currentMonthValue, 1))
        } else {
          // Next month
          goToNextMonth()
        }
        break
      case "Home":
        e.preventDefault()
        handleDateClick(1)
        break
      case "End":
        e.preventDefault()
        handleDateClick(daysInMonth)
        break
    }
  }

  return (
    <div
      ref={calendarRef}
      tabIndex={initialFocus ? 0 : undefined}
      onKeyDown={handleKeyDown}
      className={cn("p-3 outline-none", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-semibold">
          {currentMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
          })}
        </div>
        <button
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for days before the first day of the month */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => (
          <div key={`empty-${i}`} className="p-2" />
        ))}
        
        {/* Days of the month */}
        {days.map((day) => {
          const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
          )
          const isSelected = selected &&
            selected.getDate() === day &&
            selected.getMonth() === currentMonth.getMonth() &&
            selected.getFullYear() === currentMonth.getFullYear()
          const isDisabled = disabled ? disabled(date) : false

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={cn(
                "p-2 text-sm rounded",
                !isDisabled && "hover:bg-gray-100",
                isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                isDisabled && "text-gray-300 cursor-not-allowed"
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}