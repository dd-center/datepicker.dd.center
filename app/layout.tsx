import { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

// Since we always use locale, just redirect to the root locale
export default function RootLayout({ children }: Props) {
  return children
}
