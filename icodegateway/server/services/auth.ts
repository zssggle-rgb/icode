import { db } from '../db'
import { sessions } from '../db/schema'
import { eq } from 'drizzle-orm'

export const AuthService = {
  async validateSession(sessionId: string) {
    if (!sessionId) return null
    const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get()
    if (!session) return null
    if (session.expires_at < new Date()) return null
    return session
  }
}
