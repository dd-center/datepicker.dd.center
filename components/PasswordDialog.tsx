'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface PasswordDialogProps {
  password: string
  isCreator: boolean
  locale: 'zh' | 'en'
  onClose: () => void
}

export default function PasswordDialog({
  password,
  isCreator,
  locale,
  onClose
}: PasswordDialogProps) {
  const t = useTranslations('password')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
          {t('title')}
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('description')}
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            {isCreator ? t('creatorPassword') : t('userPassword')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={password}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 font-mono text-lg"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors whitespace-nowrap"
            >
              {copied ? t('copied') : t('copy')}
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md p-4 mb-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {locale === 'zh'
              ? '⚠️ 此密码已自动保存到浏览器本地存储中，但建议您将其保存到安全的地方。'
              : '⚠️ This password has been saved to your browser\'s local storage, but we recommend saving it in a secure place.'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-medium rounded-md transition-colors"
        >
          {t('close')}
        </button>
      </div>
    </div>
  )
}
