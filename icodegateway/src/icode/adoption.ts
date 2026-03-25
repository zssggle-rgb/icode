import { resolveIcodeGateway, loadSession } from "./session"

export type AdoptionType = "accept" | "reject"

export async function reportAdoption(
  requestId: string,
  adoption: AdoptionType,
  options?: { gateway?: string },
): Promise<{ success: boolean; error?: string }> {
  const session = await loadSession()
  if (!session) {
    return { success: false, error: "No active session. Run 'ican init' first." }
  }

  const gateway = options?.gateway || resolveIcodeGateway()

  try {
    const response = await fetch(`${gateway}/api/v1/adoption`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        request_id: requestId,
        adoption,
      }),
    })

    const data = (await response.json()) as any

    if (data.code !== 0) {
      return { success: false, error: data.message || "Adoption report failed" }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" }
  }
}
