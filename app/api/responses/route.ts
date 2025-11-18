import { NextRequest, NextResponse } from 'next/server'
import { getDb, Response } from '@/lib/db'
import { hashPassword, verifyPassword, generatePassword } from '@/lib/crypto'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, userName, password } = body

    if (!eventId || !userName || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const db = getDb()

    // Get the event to check creator password
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as any

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if password is creator password
    const isCreatorPassword = await verifyPassword(password, event.password_hash)

    if (!isCreatorPassword) {
      // If not creator password, check user password
      const response = db.prepare(`
        SELECT * FROM responses
        WHERE event_id = ? AND user_name = ?
      `).get(eventId, userName) as Response | undefined

      if (!response) {
        return NextResponse.json(
          { error: 'Response not found' },
          { status: 404 }
        )
      }

      // Verify user password
      const isValidUserPassword = await verifyPassword(password, response.user_password_hash)
      if (!isValidUserPassword) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 403 }
        )
      }
    }

    // Delete the response (either creator or user password was valid)
    const stmt = db.prepare(`
      DELETE FROM responses
      WHERE event_id = ? AND user_name = ?
    `)

    stmt.run(eventId, userName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
      userPassword = generatePassword()
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
