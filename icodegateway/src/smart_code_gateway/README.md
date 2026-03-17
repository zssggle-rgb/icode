# Smart Code Security Gateway (智码安全网关)

This directory contains the frontend implementation for the Smart Code Security Gateway Management Console.

## Overview
The Smart Code Security Gateway is a centralized hub for managing Code LLM requests, providing features like Unified Access & Routing, IAM & ACL, Input/Output Security Guard, Observability, and Audit & Compliance.

## UI Design
The interface follows the "Prism" design style as specified in the detailed design document:
- **Theme**: Dark mode (SOC Console style).
- **Colors**:
  - Main Background: `#0B1220`
  - Secondary Background: `#121A2A`
  - Card Background: `#172033`
  - Text: `#E6EDF7` / `#9FB0C7`
  - Primary Brand Color: `#3B82F6`

## Structure
- `App.tsx`: Main entry point and layout shell (Sidebar, Header).
- `components/`: Feature-specific components (Dashboard, Events, Policy, etc.).
- `main.tsx`: Application entry point.

## Access
The application is accessible via the `/gateway/` route (note the trailing slash).
URL: `http://localhost:3000/gateway/`
