import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import os from "os"
import { getDeviceFingerprint } from "../../icode/device"
import { gatherContext } from "../../icode/context"
import {
  IcodeSession,
  loadSession as loadIcodeSession,
  saveSession as saveIcodeSession,
  clearSession as clearIcodeSession,
  resolveIcodeGateway,
  initSession,
  isSessionExpired,
} from "../../icode/session"
import { reportAdoption } from "../../icode/adoption"

type SessionInfo = {
  gateway: string
  token: string
  session_id: string
  user: string
  repo: string
}

type GatewayPayload = {
  code?: number
  message?: string
  data?: Record<string, any>
}

function normalizeGateway(value: string) {
  return value.replace(/\/+$/, "")
}

export function resolveIcodeGateway(input?: string) {
  return normalizeGateway(input || process.env["ICODE_GATEWAY_URL"] || "http://127.0.0.1:18081")
}

export function icodeSessionPath() {
  const fromEnv = process.env["ICODE_SESSION_FILE"]
  if (fromEnv) return fromEnv
  return path.join(os.homedir(), ".opencode", "icode_session.json")
}

async function loadSession() {
  const file = icodeSessionPath()
  const raw = await readFile(file, "utf-8")
  return JSON.parse(raw) as SessionInfo
}

async function saveSession(session: SessionInfo) {
  const file = icodeSessionPath()
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(session, null, 2), "utf-8")
}

async function post(gateway: string, route: string, payload: Record<string, any>, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const response = await fetch(`${normalizeGateway(gateway)}${route}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
  const data = (await response.json()) as GatewayPayload
  return { status: response.status, payload: data }
}

function print(data: unknown) {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n")
}

export const IcodeCommand = cmd({
  command: "icode",
  describe: "formal gateway commands",
  builder: (yargs: Argv) =>
    yargs
      .command(IcodeInitCommand)
      .command(IcodeStartCommand)
      .command(IcodeGenCommand)
      .command(IcodeAdoptCommand)
      .command(IcodePagesCommand)
      .demandCommand(),
  async handler() {},
})

// CLI-1/CLI-2: init command using GitLab token, stores session at ~/.icode/session
const IcodeInitCommand = cmd({
  command: "init",
  describe: "initialize session with GitLab token (stores at ~/.icode/session)",
  builder: (yargs: Argv) =>
    yargs
      .option("gateway", {
        type: "string",
        default: resolveIcodeGateway(),
        describe: "Gateway URL",
      })
      .option("user", {
        type: "string",
        demandOption: true,
        describe: "User ID",
      })
      .option("gitlab-token", {
        type: "string",
        demandOption: true,
        describe: "GitLab Personal Access Token",
      }),
  handler: async (args) => {
    try {
      const { session, gateway } = await initSession({
        gateway: args.gateway,
        user_id: args.user,
        gitlab_token: args.gitlabToken,
      })
      print({
        status: "success",
        message: "Session initialized",
        gateway,
        user_id: session.user_id,
        expires_at: session.expires_at,
      })
    } catch (err: any) {
      print({
        status: "error",
        message: err.message || "Failed to initialize session",
      })
      process.exitCode = 1
    }
  },
})

const IcodeStartCommand = cmd({
  command: "start",
  describe: "initialize formal gateway session",
  builder: (yargs: Argv) =>
    yargs
      .option("gateway", {
        type: "string",
        default: resolveIcodeGateway(),
      })
      .option("token", {
        type: "string",
        demandOption: true,
      })
      .option("user", {
        type: "string",
        demandOption: true,
      })
      .option("password", {
        type: "string",
        demandOption: true,
      })
      .option("device", {
        type: "string",
        default: getDeviceFingerprint(),
      })
      .option("project", {
        type: "string",
        default: "proj_payment",
      })
      .option("repo", {
        type: "string",
        demandOption: true,
      }),
  handler: async (args) => {
    const gateway = resolveIcodeGateway(args.gateway)
    const result = await post(
      gateway,
      "/api/v1/session/init",
      {
        user_id: args.user,
        password: args.password,
        device_fingerprint: args.device,
        project_id: args.project,
        repo_id: args.repo,
      },
      args.token,
    )
    if (result.status !== 200 || result.payload.code !== 0 || !result.payload.data?.session_id) {
      print({
        status: result.status,
        result: result.payload,
      })
      process.exitCode = 1
      return
    }
    const sessionInfo: SessionInfo = {
      gateway,
      token: String(args.token),
      session_id: String(result.payload.data.session_id),
      user: String(args.user),
      repo: String(args.repo),
    }
    await saveSession(sessionInfo)
    print({
      status: result.status,
      session_id: sessionInfo.session_id,
      policy_version: result.payload.data.policy_version,
      project_level: result.payload.data.project_level,
    })
  },
})

const IcodeGenCommand = cmd({
  command: "gen",
  describe: "generate through formal gateway",
  builder: (yargs: Argv) =>
    yargs
      .option("prompt", {
        type: "string",
        demandOption: true,
      })
      .option("target-repo", {
        type: "string",
        default: "",
      }),
  handler: async (args) => {
    const session = await loadSession()
    
    // Gather context
    const context = await gatherContext(process.cwd())
    
    const result = await post(session.gateway, "/api/v1/chat/completions", {
      session_id: session.session_id,
      prompt: args.prompt,
      target_repo: args.targetRepo || "",
      context: context,
      options: { stream: false },
    })
    print({
      status: result.status,
      result: result.payload,
    })
    if (result.status !== 200 || result.payload.code !== 0) {
      process.exitCode = 1
    }
  },
})

// CLI-3: adoption reporting
const IcodeAdoptCommand = cmd({
  command: "adopt",
  describe: "report adoption event (accept/reject)",
  builder: (yargs: Argv) =>
    yargs
      .option("request-id", {
        type: "string",
        demandOption: true,
        describe: "Request ID to report",
      })
      .option("adoption-type", {
        choices: ["accept", "reject"] as const,
        demandOption: true,
        describe: "Adoption type",
      }),
  handler: async (args) => {
    // CLI-3: Use the new adoption module to report adoption
    const result = await reportAdoption(args.requestId, args.adoptionType as "accept" | "reject")
    if (result.success) {
      print({ status: "success", message: `Adoption ${args.adoptionType} reported for ${args.requestId}` })
    } else {
      print({ status: "error", message: result.error })
      process.exitCode = 1
    }
  },
})

const IcodePagesCommand = cmd({
  command: "pages",
  describe: "print admin page urls",
  builder: (yargs: Argv) =>
    yargs.option("gateway", {
      type: "string",
      default: resolveIcodeGateway(),
    }),
  handler: async (args) => {
    const gateway = resolveIcodeGateway(args.gateway)
    print({
      dashboard: `${gateway}/admin/dashboard`,
      events: `${gateway}/admin/events`,
      replay: `${gateway}/admin/replay`,
      policy: `${gateway}/admin/policy`,
      review: `${gateway}/admin/review`,
      sbom: `${gateway}/admin/sbom`,
    })
  },
})
