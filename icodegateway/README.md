# iCode Security Gateway

## Introduction
The iCode Security Gateway is the control plane for the iCode ecosystem. It provides:
- **Unified Access**: Single entry point for all LLM requests.
- **Security**: Device fingerprint verification, DLP scanning, and Audit logging.
- **Management**: Dashboard for monitoring usage and enforcing policies.

## Architecture
- **Backend**: Bun + Hono (running on port 18081)
- **Frontend**: React + Vite (dashboard)

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Start the server (Backend):
   ```bash
   bun run dev
   ```

3. Start the dashboard (Frontend):
   ```bash
   bun run build:frontend
   ```

## API Endpoints
- `POST /api/v1/session/init`: Initialize session with device fingerprint.
- `POST /api/v1/chat/completions`: Generate code with context and DLP.
- `POST /api/v1/adoption/report`: Report code adoption metrics.
