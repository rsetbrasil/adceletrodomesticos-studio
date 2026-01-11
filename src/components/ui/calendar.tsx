"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({
  className,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <div className="ios-calendar-wrapper">
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("ios-calendar", className)}
        classNames={{
          months: "ios-months",
          month: "ios-month",
          caption: "ios-caption",
          caption_label: "ios-caption-label",
          nav: "ios-nav",
          nav_button: "ios-nav-btn",
          table: "ios-table",
          head_row: "ios-weekdays",
          head_cell: "ios-weekday",
          row: "ios-week",
          cell: "ios-day-cell",
          day: "ios-day",
          day_selected: "ios-day-selected",
          day_today: "ios-day-today",
          day_outside: "ios-day-outside",
        }}
        components={{
          Chevron: ({ orientation }) =>
            orientation === "left" ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            ),
        }}
        {...props}
      />
    </div>
  )
}
