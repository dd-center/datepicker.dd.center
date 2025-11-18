'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

type DateStatus = 'available' | 'maybe' | 'unavailable' | null

interface CalendarProps {
  selectedDates: string[] // ISO date strings
  onDatesChange: (dates: string[]) => void
  mode?: 'select' | 'availability'
  availability?: Record<string, DateStatus>
  onAvailabilityChange?: (availability: Record<string, DateStatus>) => void
  possibleDates?: string[] // Only these dates can be interacted with in availability mode
  showHeatmap?: boolean
  heatmapData?: Record<string, number> // date -> percentage (0-100)
  locale?: 'zh' | 'en'
}

export default function Calendar({
  selectedDates,
  onDatesChange,
  mode = 'select',
  availability = {},
  onAvailabilityChange,
  possibleDates = [],
  showHeatmap = false,
  heatmapData = {},
  locale = 'zh'
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartDate, setDragStartDate] = useState<string | null>(null)
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select')
  const calendarRef = useRef<HTMLDivElement>(null)

  const dateLocale = locale === 'zh' ? zhCN : undefined

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days: Date[] = []
  let day = startDate
  while (day <= endDate) {
    days.push(day)
    day = addDays(day, 1)
  }

  const weekDays = locale === 'zh'
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const isDateSelected = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return selectedDates.includes(dateStr)
  }

  const isDatePossible = (date: Date) => {
    if (mode !== 'availability') return true
    const dateStr = format(date, 'yyyy-MM-dd')
    return possibleDates.includes(dateStr)
  }

  const getDateStatus = (date: Date): DateStatus => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return availability[dateStr] || null
  }

  const getHeatmapColor = (date: Date): string => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const percentage = heatmapData[dateStr] || 0

    if (percentage === 0) return ''
    if (percentage <= 25) return 'bg-green-100'
    if (percentage <= 50) return 'bg-green-300'
    if (percentage <= 75) return 'bg-green-500'
    return 'bg-green-700'
  }

  const handleMouseDown = (date: Date) => {
    if (!isSameMonth(date, currentMonth)) return
    if (mode === 'availability' && !isDatePossible(date)) return

    const dateStr = format(date, 'yyyy-MM-dd')
    setIsDragging(true)
    setDragStartDate(dateStr)

    if (mode === 'select') {
      // Determine drag mode based on whether the start date is selected
      const isSelected = selectedDates.includes(dateStr)
      setDragMode(isSelected ? 'deselect' : 'select')

      // Toggle the start date
      if (isSelected) {
        onDatesChange(selectedDates.filter(d => d !== dateStr))
      } else {
        onDatesChange([...selectedDates, dateStr])
      }
    }
  }

  const handleMouseEnter = (date: Date) => {
    if (!isDragging || !dragStartDate) return
    if (!isSameMonth(date, currentMonth)) return
    if (mode === 'availability' && !isDatePossible(date)) return

    const dateStr = format(date, 'yyyy-MM-dd')

    if (mode === 'select') {
      // Apply drag mode to all dates between start and current
      const allDates = selectedDates.filter(d => d !== dateStr)
      if (dragMode === 'select' && !selectedDates.includes(dateStr)) {
        onDatesChange([...allDates, dateStr])
      } else if (dragMode === 'deselect') {
        onDatesChange(allDates)
      }
    }
  }

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragStartDate(null)
  }, [])

  const handleClick = (date: Date) => {
    if (!isSameMonth(date, currentMonth)) return
    const dateStr = format(date, 'yyyy-MM-dd')

    if (mode === 'select') {
      // Already handled in mouseDown for consistency
      return
    }

    if (mode === 'availability' && isDatePossible(date)) {
      if (onAvailabilityChange) {
        const currentStatus = availability[dateStr]
        let newStatus: DateStatus

        // Cycle through: null -> available -> maybe -> unavailable -> null
        if (!currentStatus) {
          newStatus = 'available'
        } else if (currentStatus === 'available') {
          newStatus = 'maybe'
        } else if (currentStatus === 'maybe') {
          newStatus = 'unavailable'
        } else {
          newStatus = null
        }

        onAvailabilityChange({
          ...availability,
          [dateStr]: newStatus
        })
      }
    }
  }

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseUp])

  const getDayClassName = (date: Date) => {
    const baseClass = 'h-10 w-10 flex items-center justify-center rounded-md text-sm cursor-pointer transition-colors select-none'
    const isCurrentMonth = isSameMonth(date, currentMonth)
    const isPossible = isDatePossible(date)

    if (!isCurrentMonth) {
      return `${baseClass} text-gray-300 dark:text-gray-600 cursor-default`
    }

    if (mode === 'availability' && !isPossible) {
      return `${baseClass} text-gray-300 dark:text-gray-600 cursor-not-allowed`
    }

    let statusClass = ''

    if (showHeatmap) {
      const heatmapColor = getHeatmapColor(date)
      statusClass = heatmapColor ? `${heatmapColor} text-white font-semibold` : ''
    } else if (mode === 'select') {
      if (isDateSelected(date)) {
        statusClass = 'bg-blue-500 text-white font-semibold'
      } else if (isToday(date)) {
        statusClass = 'border-2 border-blue-500'
      } else {
        statusClass = 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }
    } else if (mode === 'availability') {
      const status = getDateStatus(date)
      if (status === 'available') {
        statusClass = 'bg-green-500 text-white font-semibold'
      } else if (status === 'maybe') {
        statusClass = 'bg-yellow-500 text-white font-semibold'
      } else if (status === 'unavailable') {
        statusClass = 'bg-red-500 text-white font-semibold'
      } else if (isToday(date)) {
        statusClass = 'border-2 border-blue-500'
      } else {
        statusClass = 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }
    }

    return `${baseClass} ${statusClass}`
  }

  return (
    <div className="w-full" ref={calendarRef}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ‹
        </button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'yyyy年 M月', { locale: dateLocale })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ›
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div
            key={index}
            className={getDayClassName(day)}
            onMouseDown={() => handleMouseDown(day)}
            onMouseEnter={() => handleMouseEnter(day)}
            onClick={() => handleClick(day)}
          >
            {format(day, 'd')}
          </div>
        ))}
      </div>

      {/* Legend for availability mode */}
      {mode === 'availability' && !showHeatmap && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span>{locale === 'zh' ? '可用' : 'Available'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span>{locale === 'zh' ? '也许' : 'Maybe'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span>{locale === 'zh' ? '不可用' : 'Not Available'}</span>
          </div>
        </div>
      )}

      {/* Legend for heatmap */}
      {showHeatmap && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span>{locale === 'zh' ? '可用性:' : 'Availability:'}</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded bg-green-100"></div>
            <div className="w-4 h-4 rounded bg-green-300"></div>
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <div className="w-4 h-4 rounded bg-green-700"></div>
          </div>
          <span>{locale === 'zh' ? '低 → 高' : 'Low → High'}</span>
        </div>
      )}
    </div>
  )
}
