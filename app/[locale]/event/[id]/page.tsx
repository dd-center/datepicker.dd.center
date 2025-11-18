'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Calendar from '@/components/Calendar'
import SummaryTable from '@/components/SummaryTable'
import PasswordDialog from '@/components/PasswordDialog'
import { getCreatorPassword, getUserData, saveUserData, saveUserName } from '@/lib/localStorage'

type DateStatus = 'available' | 'maybe' | 'unavailable' | null

interface EventData {
  id: string
  name: string
  possibleDates: string[]
  responses: Array<{
    id: number
    user_name: string
    availability: Record<string, DateStatus>
    created_at: number
    updated_at: number
  }>
}

export default function EventPage() {
  const params = useParams()
  const locale = useLocale()
  const t = useTranslations('event')
  const tCommon = useTranslations('common')

  const eventId = params.id as string

  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [userName, setUserName] = useState('')
  const [availability, setAvailability] = useState<Record<string, DateStatus>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [userPassword, setUserPassword] = useState('')

  const [isCreator, setIsCreator] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedDates, setEditedDates] = useState<string[]>([])

  // Load event data
  useEffect(() => {
    fetchEvent()
  }, [eventId])

  // Load user data from localStorage
  useEffect(() => {
    const userData = getUserData(eventId)
    if (userData) {
      setUserName(userData.name || '')
    }

    // Check if user is creator
    const creatorPassword = getCreatorPassword(eventId)
    if (creatorPassword) {
      setIsCreator(true)
    }
  }, [eventId])

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`)
      if (!response.ok) {
        throw new Error('Event not found')
      }

      const data = await response.json()
      setEvent(data)

      // Load user's existing response if any
      const userData = getUserData(eventId)
      if (userData?.name) {
        const userResponse = data.responses.find(
          (r: any) => r.user_name === userData.name
        )
        if (userResponse) {
          setAvailability(userResponse.availability)
        }
      }
    } catch (err) {
      setError(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAvailability = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!userName.trim()) {
      setError(t('nameRequired'))
      return
    }

    const hasAvailability = Object.values(availability).some(v => v !== null)
    if (!hasAvailability) {
      setError(t('availabilityRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      const userData = getUserData(eventId)
      const password = userData?.password

      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId,
          userName: userName.trim(),
          availability,
          password
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit')
      }

      const data = await response.json()

      // If new user, save password and show dialog
      if (data.isNewUser && data.password) {
        saveUserData(eventId, userName.trim(), data.password)
        setUserPassword(data.password)
        setShowPasswordDialog(true)
      } else {
        // Just save the name
        saveUserName(eventId, userName.trim())
      }

      // Refresh event data
      await fetchEvent()
    } catch (err: any) {
      setError(err.message || tCommon('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditEvent = async () => {
    if (!isCreator || !event) return

    setError('')
    setIsSubmitting(true)

    try {
      const creatorPassword = getCreatorPassword(eventId)
      if (!creatorPassword) {
        throw new Error('Creator password not found')
      }

      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: creatorPassword,
          name: editedName,
          possibleDates: editedDates.sort()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update event')
      }

      setIsEditing(false)
      await fetchEvent()
    } catch (err: any) {
      setError(err.message || tCommon('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEditing = () => {
    if (!event) return
    setEditedName(event.name)
    setEditedDates([...event.possibleDates])
    setIsEditing(true)
  }

  const calculateHeatmapData = (): Record<string, number> => {
    if (!event || event.responses.length === 0) return {}

    const heatmap: Record<string, number> = {}

    event.possibleDates.forEach(date => {
      const availableCount = event.responses.filter(
        r => r.availability[date] === 'available'
      ).length

      const percentage = (availableCount / event.responses.length) * 100
      heatmap[date] = percentage
    })

    return heatmap
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{tCommon('loading')}</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{error || 'Event not found'}</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Event header */}
          <div className="mb-8">
            {isEditing ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4">{t('editEvent')}</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    {t('editName')}
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    {t('editDates')}
                  </label>
                  <Calendar
                    selectedDates={editedDates}
                    onDatesChange={setEditedDates}
                    mode="select"
                    locale={locale as 'zh' | 'en'}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleEditEvent}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md"
                  >
                    {t('saveChanges')}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 rounded-md"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  {event.name}
                </h1>
                {isCreator && (
                  <button
                    onClick={startEditing}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                  >
                    {t('editEvent')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column: Availability input */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">{t('yourAvailability')}</h2>

              <form onSubmit={handleSubmitAvailability}>
                <div className="mb-4">
                  <label htmlFor="userName" className="block text-sm font-medium mb-2">
                    {t('yourName')}
                  </label>
                  <input
                    id="userName"
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={t('yourNamePlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    {t('selectAvailability')}
                  </label>
                  <Calendar
                    selectedDates={[]}
                    onDatesChange={() => {}}
                    mode="availability"
                    availability={availability}
                    onAvailabilityChange={setAvailability}
                    possibleDates={event.possibleDates}
                    locale={locale as 'zh' | 'en'}
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-md"
                >
                  {isSubmitting ? (locale === 'zh' ? '提交中...' : 'Submitting...') : t('submit')}
                </button>
              </form>
            </div>

            {/* Right column: Heatmap visualization */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">{t('summary')}</h2>
              <Calendar
                selectedDates={[]}
                onDatesChange={() => {}}
                mode="select"
                possibleDates={event.possibleDates}
                showHeatmap={true}
                heatmapData={calculateHeatmapData()}
                locale={locale as 'zh' | 'en'}
              />
              <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                {locale === 'zh'
                  ? `共有 ${event.responses.length} 人提交了可用性`
                  : `${event.responses.length} people have submitted their availability`}
              </div>
            </div>
          </div>

          {/* Summary table */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{t('summary')}</h2>
            <SummaryTable
              possibleDates={event.possibleDates}
              responses={event.responses}
              locale={locale as 'zh' | 'en'}
            />
          </div>
        </div>
      </div>

      {/* Password dialog */}
      {showPasswordDialog && (
        <PasswordDialog
          password={userPassword}
          isCreator={false}
          locale={locale as 'zh' | 'en'}
          onClose={() => setShowPasswordDialog(false)}
        />
      )}
    </main>
  )
}
