'use client'

// Storage keys
const CREATOR_PASSWORDS_KEY = 'datepicker_creator_passwords'
const USER_DATA_KEY = 'datepicker_user_data'

// Creator password storage
export function saveCreatorPassword(eventId: string, password: string) {
  if (typeof window === 'undefined') return

  const passwords = getCreatorPasswords()
  passwords[eventId] = password
  localStorage.setItem(CREATOR_PASSWORDS_KEY, JSON.stringify(passwords))
}

export function getCreatorPassword(eventId: string): string | null {
  if (typeof window === 'undefined') return null

  const passwords = getCreatorPasswords()
  return passwords[eventId] || null
}

function getCreatorPasswords(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const stored = localStorage.getItem(CREATOR_PASSWORDS_KEY)
  return stored ? JSON.parse(stored) : {}
}

// User data storage (name + password per event)
export function saveUserData(eventId: string, name: string, password: string) {
  if (typeof window === 'undefined') return

  const userData = getUserData()
  userData[eventId] = { name, password }
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData))
}

export function getUserData(eventId?: string): any {
  if (typeof window === 'undefined') return eventId ? null : {}

  const stored = localStorage.getItem(USER_DATA_KEY)
  const allData = stored ? JSON.parse(stored) : {}

  return eventId ? (allData[eventId] || null) : allData
}

export function saveUserName(eventId: string, name: string) {
  if (typeof window === 'undefined') return

  const userData = getUserData(eventId) || {}
  userData.name = name

  const allData = getUserData()
  allData[eventId] = userData
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(allData))
}

export function getUserName(eventId: string): string | null {
  if (typeof window === 'undefined') return null

  const userData = getUserData(eventId)
  return userData?.name || null
}
