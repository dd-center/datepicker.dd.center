'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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
  const [editPasswordInput, setEditPasswordInput] = useState('')
  const [showEditPasswordInput, setShowEditPasswordInput] = useState(false)

  const [showResponsePasswordDialog, setShowResponsePasswordDialog] = useState(false)
  const [responsePasswordInput, setResponsePasswordInput] = useState('')
  const [currentResponseAction, setCurrentResponseAction] = useState<{ type: 'edit' | 'delete', userName: string } | null>(null)
  const [editingUserPassword, setEditingUserPassword] = useState<string | null>(null)

  // Set page title
  useEffect(() => {
    if (event) {
      document.title = `${event.name} - ${locale === 'zh' ? '日期选择器' : 'Date Picker'}`
    }
  }, [event, locale])

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
      // Use editing password if available, otherwise use stored password
      const password = editingUserPassword || userData?.password

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

      // Clear editing password after successful submission
      setEditingUserPassword(null)
    } catch (err: any) {
      setError(err.message || tCommon('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditEvent = async () => {
    if (!event) return

    setError('')
    setIsSubmitting(true)

    try {
      let creatorPassword = getCreatorPassword(eventId)

      // If no password in localStorage and password input is shown, use the input
      if (!creatorPassword && showEditPasswordInput) {
        if (!editPasswordInput.trim()) {
          throw new Error(locale === 'zh' ? '请输入密码' : 'Please enter password')
        }
        creatorPassword = editPasswordInput.trim()
      }

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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update event')
      }

      setIsEditing(false)
      setShowEditPasswordInput(false)
      setEditPasswordInput('')
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

    // If no creator password in localStorage, show password input
    if (!getCreatorPassword(eventId)) {
      setShowEditPasswordInput(true)
    }
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

  const handleEditResponseClick = (userName: string) => {
    setCurrentResponseAction({ type: 'edit', userName })

    // Check if we have the password in localStorage
    const userData = getUserData(eventId)
    if (userData?.name === userName && userData?.password) {
      // Auto-load the user's response for editing and store password
      setEditingUserPassword(userData.password)
      loadResponseForEditing(userName)
    } else {
      // Show password dialog
      setShowResponsePasswordDialog(true)
    }
  }

  const handleDeleteResponseClick = (userName: string) => {
    setCurrentResponseAction({ type: 'delete', userName })

    // Check if we have the password in localStorage
    const userData = getUserData(eventId)
    if (userData?.name === userName && userData?.password) {
      // Auto-delete with stored password
      deleteResponse(userName, userData.password)
    } else {
      // Show password dialog
      setShowResponsePasswordDialog(true)
    }
  }

  const loadResponseForEditing = (userName: string) => {
    if (!event) return

    const response = event.responses.find(r => r.user_name === userName)
    if (response) {
      setUserName(userName)
      setAvailability(response.availability)
      // Scroll to availability form
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const deleteResponse = async (userName: string, password: string) => {
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/responses', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId,
          userName,
          password
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete response')
      }

      // Refresh event data
      await fetchEvent()
      setShowResponsePasswordDialog(false)
      setResponsePasswordInput('')
      setCurrentResponseAction(null)
    } catch (err: any) {
      setError(err.message || tCommon('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreatorDeleteResponse = async (userName: string) => {
    setError('')

    // Get creator password
    let creatorPassword = getCreatorPassword(eventId)

    // If no password in localStorage and password input is shown, use the input
    if (!creatorPassword && showEditPasswordInput && editPasswordInput.trim()) {
      creatorPassword = editPasswordInput.trim()
    }

    if (!creatorPassword) {
      setError(locale === 'zh' ? '未找到管理密码' : 'Creator password not found')
      return
    }

    if (!confirm(locale === 'zh' ? `确定要删除 ${userName} 的回复吗？` : `Are you sure you want to delete ${userName}'s response?`)) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/responses', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId,
          userName,
          password: creatorPassword
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete response')
      }

      // Refresh event data
      await fetchEvent()
    } catch (err: any) {
      setError(err.message || tCommon('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResponsePasswordSubmit = async () => {
    if (!currentResponseAction) return

    if (!responsePasswordInput.trim()) {
      setError(locale === 'zh' ? '请输入密码' : 'Please enter password')
      return
    }

    if (currentResponseAction.type === 'edit') {
      // Verify password and load response
      setError('')
      setIsSubmitting(true)

      try {
        // Try to submit with the password to verify it
        const userData = getUserData(eventId)
        const response = await fetch('/api/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            eventId,
            userName: currentResponseAction.userName,
            availability: event?.responses.find(r => r.user_name === currentResponseAction.userName)?.availability || {},
            password: responsePasswordInput.trim()
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Invalid password')
        }

        // Password is valid, load the response for editing and store the password
        setEditingUserPassword(responsePasswordInput.trim())
        loadResponseForEditing(currentResponseAction.userName)
        setShowResponsePasswordDialog(false)
        setResponsePasswordInput('')
        setCurrentResponseAction(null)
      } catch (err: any) {
        setError(err.message || tCommon('error'))
      } finally {
        setIsSubmitting(false)
      }
    } else if (currentResponseAction.type === 'delete') {
      await deleteResponse(currentResponseAction.userName, responsePasswordInput.trim())
    }
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

                {showEditPasswordInput && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      {locale === 'zh' ? '活动管理密码' : 'Event Management Password'}
                    </label>
                    <input
                      type="password"
                      value={editPasswordInput}
                      onChange={(e) => setEditPasswordInput(e.target.value)}
                      placeholder={locale === 'zh' ? '输入活动管理密码' : 'Enter event management password'}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                    />
                  </div>
                )}

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

                {/* Response management */}
                {event.responses.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      {locale === 'zh' ? '管理回复' : 'Manage Responses'}
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-md divide-y divide-gray-300 dark:divide-gray-600">
                      {event.responses.map((response) => (
                        <div key={response.id} className="flex items-center justify-between p-3">
                          <span className="font-medium">{response.user_name}</span>
                          <button
                            type="button"
                            onClick={() => handleCreatorDeleteResponse(response.user_name)}
                            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
                          >
                            {locale === 'zh' ? '删除' : 'Delete'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleEditEvent}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md"
                  >
                    {t('saveChanges')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setShowEditPasswordInput(false)
                      setEditPasswordInput('')
                      setError('')
                    }}
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
                <button
                  type="button"
                  onClick={startEditing}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                >
                  {isCreator ? t('editEvent') : (locale === 'zh' ? '编辑活动（需要密码）' : 'Edit Event (Requires Password)')}
                </button>
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
                    showAllMonths={true}
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
                showAllMonths={true}
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
              onEditResponse={handleEditResponseClick}
              onDeleteResponse={handleDeleteResponseClick}
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

      {/* Response action password dialog */}
      {showResponsePasswordDialog && currentResponseAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {currentResponseAction.type === 'edit'
                ? (locale === 'zh' ? '编辑回复' : 'Edit Response')
                : (locale === 'zh' ? '删除回复' : 'Delete Response')}
            </h3>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              {locale === 'zh'
                ? `请输入 ${currentResponseAction.userName} 的密码`
                : `Please enter password for ${currentResponseAction.userName}`}
            </p>
            <input
              type="password"
              value={responsePasswordInput}
              onChange={(e) => setResponsePasswordInput(e.target.value)}
              placeholder={locale === 'zh' ? '输入密码' : 'Enter password'}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleResponsePasswordSubmit()
                }
              }}
            />
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResponsePasswordSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md"
              >
                {isSubmitting ? (locale === 'zh' ? '处理中...' : 'Processing...') : (locale === 'zh' ? '确认' : 'Confirm')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResponsePasswordDialog(false)
                  setResponsePasswordInput('')
                  setCurrentResponseAction(null)
                  setError('')
                }}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 rounded-md"
              >
                {locale === 'zh' ? '取消' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
