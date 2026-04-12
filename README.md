# Redmine Desktop Task Manager

Desktop application built with Electron to manage Redmine tasks and track/log work time quickly.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Logging Capabilities](#logging-capabilities)
- [Testing](#testing)
- [How to Create New Tests](#how-to-create-new-tests)
- [Project Structure](#project-structure)
- [Notes](#notes)

## Overview
Redmine Desktop Task Manager brings the following into a single UI:
- Assigned/open issues browsing.
- Timer-based time tracking.
- Manual time entry creation.
- Full issue detail view.
- Application log viewing, filtering, export, and cleanup.

## Features

### Configuration Management
- Local persistence of Redmine configuration:
  - `baseUrl`
  - `apiKey`
  - `userId` (optional)
  - `defaultActivityId` (optional)
  - `issueQuery`
  - `themeMode` (`dark`, `light`, `pink`)
- Base URL and issue query normalization.
- Stored in `userData/store.json`.

### Issue Management
- Loads issues from `/issues.json`.
- Supports configurable Redmine query filters.
- Manual refresh for issue list.
- Displays core issue information:
  - id, tracker, status, project
  - spent/estimated hours

### Work Timer
- Start timer directly from an issue.
- Persists active timer across app restarts.
- Live elapsed-time display.
- Stop and log tracked time to Redmine (`/time_entries.json`).
- Discard timer without creating a time entry.
- Minimum-duration validation to prevent invalid logs.

### Manual Time Entry
- Create manual time entries with:
  - issue id
  - hours
  - date
  - comments
  - optional activity id
- Load existing entries for an issue (`/time_entries.json?issue_id=...`).

### Issue Detail View
- Loads full detail from `/issues/:id.json` with additional includes.
- Renders:
  - description
  - attachments
  - watchers
  - relations
  - child issues
  - custom fields
  - status/date/progress data
- Sanitizes description HTML for safety.
- Secure external/attachment opening (HTTP/HTTPS only).

### Logging and Observability
- Records `info` and `error` events from both main and renderer processes.
- Built-in log filtering by:
  - level
  - source
  - error type
  - date range
  - text search
- Export filtered logs to JSON.
- Clear logs directly from the UI.

### Navigation and UI
- Dedicated views: `Tasks`, `Issue Detail`, `Logs`, `Settings`.
- Collapsible side menu.
- Per-action status/feedback messages.
- Configurable visual themes.

## Tech Stack
- Electron
- JavaScript
- HTML/CSS
- Playwright (test automation)

## Requirements
- Node.js 18+
- npm 9+
- Access to a Redmine instance with a valid API key (for real usage)

## Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm start
   ```

## Configuration
In `Settings`, fill at least:
- `Base URL` (example: `https://redmine.yourdomain.com`)
- `API Key`

Optional fields:
- `User ID`
- `Default Activity ID`
- `Issue Query`
- `Theme`

## Usage
1. Save your configuration in `Settings`.
2. Open `Tasks` and load/refresh issues.
3. Start a timer from an issue or log time manually.
4. Open `Issue Detail` for expanded issue data.
5. Open `Logs` to inspect, filter, export, or clear logs.

## Logging Capabilities
- Configuration/timer store file: `userData/store.json`
- Application log file: `userData/app.log`

From the **Logs** view, you can:
- View recent log entries.
- Filter entries by level/source/error/date/text.
- Export filtered results to JSON.
- Clear all current logs.

`userData` is the Electron data directory for the current OS/user.

## Testing

### Available Scripts
- Start the app:
  ```bash
  npm start
  ```
- Full Electron E2E suite:
  ```bash
  npm run test:e2e
  ```
- Playwright TodoMVC demo scenarios:
  ```bash
  node scripts/playwright-todomvc-scenarios.js
  ```

### Generated Artifacts
- App E2E screenshots: `test-artifacts/electron-e2e-screenshots/`
- E2E JSON report: `test-artifacts/electron-e2e-report.json`
- TodoMVC screenshots: `test-artifacts/screenshots/`

## How to Create New Tests

### 1. Reuse the Main Runner
Use `scripts/e2e-electron-full-test.js` as your base.

Each scenario is defined inside the `scenarios` array:

```js
{
  name: 'scenario name',
  run: async () => {
    // steps
    // assertions
  },
}
```

### 2. Add a New Scenario
Minimal example:

```js
{
  name: 'validate settings save',
  run: async () => {
    await win.click('#menuToggle');
    await win.click('#viewSettingsBtn');
    await win.selectOption('#themeMode', 'light');
    await win.click('#configForm button[type="submit"]');
    await win.waitForFunction(() =>
      document.querySelector('#configStatus')?.textContent?.includes('Settings saved.')
    );
  },
}
```

### 3. Automatic Screenshots and Report
No extra code is required:
- The runner creates one screenshot per scenario (`pass`/`fail`).
- The runner updates `test-artifacts/electron-e2e-report.json`.

### 4. Best Practices
- Keep scenarios small and focused.
- Avoid real-user data dependencies when possible (use mock server data).
- Prefer stable selectors (`id`, `data-*`).
- Use clear assertion error messages.

## Project Structure

```text
.
├─ src/
│  ├─ main/
│  │  ├─ config/
│  │  ├─ ipc/
│  │  ├─ security/
│  │  ├─ services/
│  │  └─ windows/
│  ├─ preload/
│  │  └─ index.js
│  ├─ renderer/
│  │  ├─ constants/
│  │  ├─ dom/
│  │  ├─ features/
│  │  ├─ services/
│  │  ├─ state/
│  │  ├─ styles/
│  │  └─ utils/
│  └─ shared/
│     ├─ constants/
│     ├─ ipc/
│     └─ utils/
├─ scripts/
│  ├─ e2e-electron-full-test.js
│  └─ playwright-todomvc-scenarios.js
├─ test-artifacts/
│  ├─ electron-e2e-report.json
│  ├─ electron-e2e-screenshots/
│  └─ screenshots/
├─ package.json
└─ README.md
```

## Notes
- The app uses Redmine REST API with the `X-Redmine-API-Key` header.
- If `activityId` is not provided, Redmine server defaults are applied.
- `.claude/` is ignored in `.gitignore`.
