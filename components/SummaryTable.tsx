'use client'

import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

type DateStatus = 'available' | 'maybe' | 'unavailable' | null

interface Response {
  id: number
  user_name: string
  availability: Record<string, DateStatus>
  created_at: number
  updated_at: number
}

interface SummaryTableProps {
  possibleDates: string[]
  responses: Response[]
  locale: 'zh' | 'en'
}

export default function SummaryTable({
  possibleDates,
  responses,
  locale
}: SummaryTableProps) {
  const dateLocale = locale === 'zh' ? zhCN : undefined

  const getStatusColor = (status: DateStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 text-white'
      case 'maybe':
        return 'bg-yellow-500 text-white'
      case 'unavailable':
        return 'bg-red-500 text-white'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-400'
    }
  }

  const getStatusText = (status: DateStatus) => {
    switch (status) {
      case 'available':
        return locale === 'zh' ? '✓' : '✓'
      case 'maybe':
        return locale === 'zh' ? '?' : '?'
      case 'unavailable':
        return locale === 'zh' ? '✗' : '✗'
      default:
        return '-'
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr)
      return format(date, locale === 'zh' ? 'M月d日' : 'MMM d', { locale: dateLocale })
    } catch {
      return dateStr
    }
  }

  if (responses.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        {locale === 'zh' ? '还没有人提交可用性' : 'No responses yet'}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-50 dark:bg-gray-700 text-left sticky left-0 z-10">
              {locale === 'zh' ? '姓名' : 'Name'}
            </th>
            {possibleDates.map(date => (
              <th
                key={date}
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-700 text-center min-w-[80px]"
              >
                <div className="text-xs">{formatDate(date)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {format(parseISO(date), 'EEE', { locale: dateLocale })}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {responses.map((response) => (
            <tr key={response.id}>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-medium sticky left-0 bg-white dark:bg-gray-800 z-10">
                {response.user_name}
              </td>
              {possibleDates.map(date => {
                const status = response.availability[date]
                return (
                  <td
                    key={date}
                    className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center"
                  >
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded ${getStatusColor(status)}`}>
                      {getStatusText(status)}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary row */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
        <h3 className="font-semibold mb-2">
          {locale === 'zh' ? '统计：' : 'Summary:'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {possibleDates.map(date => {
            const availableCount = responses.filter(
              r => r.availability[date] === 'available'
            ).length
            const maybeCount = responses.filter(
              r => r.availability[date] === 'maybe'
            ).length

            return (
              <div key={date} className="flex justify-between items-center">
                <span className="font-medium">{formatDate(date)}:</span>
                <span>
                  <span className="text-green-600 dark:text-green-400">{availableCount} ✓</span>
                  {maybeCount > 0 && (
                    <span className="ml-2 text-yellow-600 dark:text-yellow-400">{maybeCount} ?</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
