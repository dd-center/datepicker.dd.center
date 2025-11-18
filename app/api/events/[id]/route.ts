import { NextRequest, NextResponse } from 'next/server'
import { getDb, Event } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDb()

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get all responses for this event
    const responses = db.prepare(`
      SELECT id, event_id, user_name, availability, created_at, updated_at
      FROM responses
      WHERE event_id = ?
      ORDER BY user_name
    `).all(id)

    return NextResponse.json({
      id: event.id,
      name: event.name,
      possibleDates: JSON.parse(event.possible_dates),
      responses: responses.map((r: any) => ({
        ...r,
        availability: JSON.parse(r.availability)
      }))
    })
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { password, name, possibleDates } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 401 }
      )
    }

    const db = getDb()
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, event.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 403 }
      )
    }

    // Update event
    const updates: string[] = []
    const values: any[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name)
    }

    if (possibleDates !== undefined && Array.isArray(possibleDates)) {
      updates.push('possible_dates = ?')
      values.push(JSON.stringify(possibleDates))
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    values.push(id)

    const stmt = db.prepare(`
      UPDATE events
      SET ${updates.join(', ')}
      WHERE id = ?
    `)

    stmt.run(...values)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
