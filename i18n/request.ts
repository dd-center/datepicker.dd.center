import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'

// Can be imported from a shared config
const locales = ['en', 'zh']

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the incoming `locale` parameter is valid
  let locale = await requestLocale

  if (!locale || !locales.includes(locale as any)) {
    notFound()
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  }
})
