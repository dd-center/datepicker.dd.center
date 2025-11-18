'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Calendar from './Calendar'
import PasswordDialog from './PasswordDialog'
import { saveCreatorPassword } from '@/lib/localStorage'

export default function EventCreationForm() {
  const t = useTranslations('home')
  const locale = useLocale()
  const router = useRouter()

  const [eventName, setEventName] = useState('')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [createdEventId, setCreatedEventId] = useState('')
  const [creatorPassword, setCreatorPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!eventName.trim()) {
      setError(t('eventNameRequired'))
      return
    }

    if (selectedDates.length === 0) {
      setError(t('datesRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: eventName,
          possibleDates: selectedDates.sort()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      const data = await response.json()

      // Save creator password to localStorage
      saveCreatorPassword(data.eventId, data.password)

      // Show password dialog
      setCreatedEventId(data.eventId)
      setCreatorPassword(data.password)
      setShowPasswordDialog(true)
    } catch (err) {
      setError('Failed to create event. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordDialogClose = () => {
    setShowPasswordDialog(false)
    // Redirect to event page
    router.push(`/${locale}/event/${createdEventId}`)
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <form onSubmit={handleSubmit}>
          {/* Event name input */}
          <div className="mb-6">
            <label htmlFor="eventName" className="block text-sm font-medium mb-2">
              {t('eventName')}
            </label>
            <input
              id="eventName"
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder={t('eventNamePlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
            />
          </div>

          {/* Date selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {t('selectDates')}
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('selectDatesHint')}
            </p>
            <Calendar
              selectedDates={selectedDates}
              onDatesChange={setSelectedDates}
              mode="select"
              locale={locale as 'zh' | 'en'}
            />
          </div>

          {/* Selected dates display */}
          {selectedDates.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {locale === 'zh' ? `已选择 ${selectedDates.length} 个日期` : `${selectedDates.length} dates selected`}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedDates.slice(0, 10).map(date => (
                  <span
                    key={date}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {date}
                  </span>
                ))}
                {selectedDates.length > 10 && (
                  <span className="px-3 py-1 text-gray-600 dark:text-gray-400 text-sm">
                    +{selectedDates.length - 10} {locale === 'zh' ? '个' : 'more'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
          >
            {isSubmitting ? (locale === 'zh' ? '创建中...' : 'Creating...') : t('createEvent')}
          </button>
        </form>
      </div>

      {/* Password dialog */}
      {showPasswordDialog && (
        <PasswordDialog
          password={creatorPassword}
          isCreator={true}
          locale={locale as 'zh' | 'en'}
          onClose={handlePasswordDialogClose}
        />
      )}
    </>
  )
}
