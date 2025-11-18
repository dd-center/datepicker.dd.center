import { NextRequest, NextResponse } from 'next/server'
import { getDb, Response } from '@/lib/db'
import { hashPassword, verifyPassword, generatePassword } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, userName, availability, password } = body

    if (!eventId || !userName || !availability) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if user already has a response
    const existingResponse = db.prepare(`
      SELECT * FROM responses
      WHERE event_id = ? AND user_name = ?
    `).get(eventId, userName) as Response | undefined

    let userPassword = password
    let isNewUser = !existingResponse

    if (existingResponse) {
      // Verify password if updating
      if (!password) {
        return NextResponse.json(
          { error: 'Password required for updating' },
          { status: 401 }
        )
      }

      const isValid = await verifyPassword(password, existingResponse.user_password_hash)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 403 }
        )
      }

      // Update existing response
      const stmt = db.prepare(`
        UPDATE responses
        SET availability = ?, updated_at = ?
        WHERE event_id = ? AND user_name = ?
      `)

      stmt.run(
        JSON.stringify(availability),
        Date.now(),
        eventId,
        userName
      )
    } else {
      // Create new response with generated password
      userPassword = generatePassword(12)
      const passwordHash = await hashPassword(userPassword)

      const stmt = db.prepare(`
        INSERT INTO responses (event_id, user_name, user_password_hash, availability, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      const now = Date.now()
      stmt.run(
        eventId,
        userName,
        passwordHash,
        JSON.stringify(availability),
        now,
        now
      )
    }

    return NextResponse.json({
      success: true,
      password: isNewUser ? userPassword : undefined,
      isNewUser
    })
  } catch (error) {
    console.error('Error saving response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
