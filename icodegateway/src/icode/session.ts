import fs from "fs/promises"
import path from "path"
import os from "os"
import { getDeviceFingerprint } from "./device"

export interface IcodeSession {
  token: string
  user_id: string
  gitlab_token: string
  created_at: string
  expires_at: string
}

const SESSION_DIR = path.join(os.homedir(), ".icode")
const SESSION_FILE = path.join(SESSION_DIR, "session")

export function resolveIcodeGateway(input?: string): string {
  const fromEnv = process.env["ICODE_GATEWAY_URL"]
  const base = input || fromEnv || "http://127.0.0.1:18081"
  return base.replace(/\/+$/, "")
}

export async function loadSession(): Promise<IcodeSession | null> {
  try {
    const raw = await fs.readFile(SESSION_FILE, "utf-8")
    return JSON.parse(raw) as IcodeSession
  } catch {
    return null
  }
}

export async function saveSession(session: IcodeSession): Promise<void> {
  await fs.mkdir(SESSION_DIR, { recursive: true })
  await fs.writeFile(SESSION_FILE, JSON.stringify(session, null, 2), "utf-8")
  // Set file permissions to 0600 (owner read/write only)
  await fs.chmod(SESSION_FILE, 0o600)
}

export async function clearSession(): Promise<void> {
  try {
    await fs.unlink(SESSION_FILE)
  } catch {
    // ignore if file doesn't exist
  }
}

export function isSessionExpired(session: IcodeSession): boolean {
  return new Date(session.expires_at) <= new Date()
}

export async function initSession(params: {
  gateway: string
  user_id: string
  gitlab_token: string
}): Promise<{ session: IcodeSession; gateway: string }> {
  const { gateway, user_id, gitlab_token } = params
  const normalizedGateway = resolveIcodeGateway(gateway)

  const response = await fetch(`${normalizedGateway}/api/v1/session/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id,
      device_fingerprint: getDeviceFingerprint(),
      gitlab_token,
    }),
  })

  const data = (await response.json()) as any

  if (data.code !== 0) {
    throw new Error(data.message || "Session init failed")
  }

  const session: IcodeSession = {
    token: data.data.token,
    user_id,
    gitlab_token,
    created_at: new Date().toISOString(),
    expires_at: data.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  await saveSession(session)

  return { session, gateway: normalizedGateway }
}
