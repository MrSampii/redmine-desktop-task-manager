# redmine-desktop-task-manager
Desktop Electron app to manage Redmine issues and track/log time.

## Features
- Save Redmine connection settings locally (`baseUrl`, `apiKey`, optional `userId`, optional default `activityId`)
- Load assigned/open issues from Redmine (`/issues.json`)
- Start a timer on any issue
- Stop timer and automatically log elapsed time to Redmine (`/time_entries.json`)
- Add manual time entries
- Load existing time entries for an issue
- Persist active timer between app restarts

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start app:
   ```bash
   npm start
   ```

## Usage
1. Fill **Base URL** and **API Key**, then save settings.
2. Refresh/load issues.
3. Click **Start timer** on an issue.
4. Click **Stop and Log** to register time in Redmine.
5. Use **Manual Time Entry** for ad-hoc logging.

## Notes
- Data is stored in Electron `userData/store.json`.
- Time entries use Redmine REST API with header `X-Redmine-API-Key`.
- If `activityId` is not provided, Redmine server defaults apply.
