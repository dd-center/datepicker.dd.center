import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db'
import { hashPassword, generatePassword } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, possibleDates } = body

    if (!name || !possibleDates || !Array.isArray(possibleDates) || possibleDates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // Generate event ID and password
    const eventId = uuidv4()
    const password = generatePassword(12)
    const passwordHash = await hashPassword(password)

    // Save to database
    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO events (id, name, password_hash, possible_dates, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(
      eventId,
      name,
      passwordHash,
      JSON.stringify(possibleDates),
      Date.now()
    )

    return NextResponse.json({
      eventId,
      password
    })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
