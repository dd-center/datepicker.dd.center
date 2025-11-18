'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import EventCreationForm from '@/components/EventCreationForm'

export default function HomePage() {
  const locale = useLocale()

  useEffect(() => {
    document.title = locale === 'zh' ? '日期选择器 - 创建活动' : 'Date Picker - Create Event'
  }, [locale])

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            日期选择器 / Date Picker
          </h1>
          <EventCreationForm />
        </div>
      </div>
    </main>
  )
}
