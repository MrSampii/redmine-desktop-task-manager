# Contributing

Thank you for your interest in contributing to **Redmine Desktop Task Manager**.

This project is an Electron desktop application for managing Redmine issues and tracking/logging work time.

## Code of Conduct

By participating in this project, you agree to follow the project’s `CODE_OF_CONDUCT.md`.

Please be respectful, constructive, and considerate when opening issues, reviewing code, or discussing changes.

## Security Issues

Do **not** report security vulnerabilities through public GitHub issues.

If you discover a security issue, please follow the instructions in `SECURITY.md` and report it privately through GitHub Security Advisories.

Security-sensitive examples include:

* API key exposure
* Unauthorized access to Redmine data
* Unsafe file, URL, or attachment handling
* Command execution vulnerabilities
* Electron security issues

## Project Requirements

Before contributing, make sure you have:

* Node.js 18 or newer
* npm 9 or newer
* Git
* Access to a Redmine instance and API key, only if your change requires real Redmine testing

## Getting Started

1. Fork the repository.

2. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/redmine-desktop-task-manager.git
```

3. Enter the project directory:

```bash
cd redmine-desktop-task-manager
```

4. Install dependencies:

```bash
npm install
```

5. Start the app:

```bash
npm start
```

## Development Workflow

Create a branch for your change:

```bash
git checkout -b feature/short-description
```

Use a branch name that describes the work, for example:

```bash
feature/manual-time-entry-validation
fix/timer-persistence
docs/update-redmine-setup
test/add-settings-scenario
```

## Project Structure

The main source code is organized under `src/`:

```text
src/
├─ main/       # Electron main process code
├─ preload/    # Preload script and secure bridge code
├─ renderer/   # UI, DOM, views, state, and frontend behavior
└─ shared/     # Shared constants, IPC names, and utilities
```

Supporting scripts are located in `scripts/`.

## Coding Guidelines

Please follow the existing JavaScript style and keep changes focused.

General guidelines:

* Use clear, descriptive names.
* Keep functions small where practical.
* Prefer readable code over clever code.
* Avoid unrelated refactors in feature or bug-fix pull requests.
* Keep Electron main-process, preload, renderer, and shared responsibilities separated.
* Do not expose Node.js or Electron APIs directly to renderer code unless they are intentionally bridged through preload code.
* Avoid committing generated files, logs, local configuration, or test artifacts.

## Electron Security Guidelines

Because this is a desktop application that connects to Redmine, security matters.

When contributing, please:

* Never hard-code Redmine API keys, URLs, credentials, or user data.
* Do not log sensitive values such as API keys.
* Validate and sanitize user-controlled data before rendering it.
* Keep external URL and attachment handling restricted and intentional.
* Prefer safe IPC patterns between main, preload, and renderer code.
* Treat files in Electron `userData` as local runtime data, not source-controlled project files.

## Linting

Run lint checks before opening a pull request:

```bash
npm run lint
```

To automatically fix supported lint issues:

```bash
npm run lint:fix
```

The project uses ESLint. Current rules include checks such as:

* `no-undef`
* `eqeqeq`
* `curly`
* `no-shadow`
* unused variable warnings, with `_`-prefixed arguments ignored

## Pre-commit Secret Scanning

The repository includes a pre-commit configuration for Gitleaks.

If you use `pre-commit`, install and enable it with:

```bash
pre-commit install
```

Then run checks manually with:

```bash
pre-commit run --all-files
```

This helps prevent secrets, tokens, and API keys from being committed.

## Testing

Run the full Electron end-to-end test suite with:

```bash
npm run test:e2e
```

The repository also includes a Playwright TodoMVC demo scenario script:

```bash
node scripts/playwright-todomvc-scenarios.js
```

Generated test artifacts may include screenshots and JSON reports under `test-artifacts/`. These are local outputs and should not be committed unless a maintainer specifically asks for them.

## Adding or Updating E2E Tests

Use `scripts/e2e-electron-full-test.js` as the base for app E2E tests.

When adding a scenario:

* Keep it small and focused.
* Prefer stable selectors such as `id` or `data-*`.
* Avoid depending on real user data.
* Use mock or controlled data where possible.
* Include clear assertion messages.
* Make sure failures produce useful screenshots or report output.

Example scenario shape:

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

## Redmine-Related Changes

When changing Redmine integration behavior, please consider:

* API URL normalization
* API key handling
* Query parameter handling
* Redmine error responses
* Optional fields such as user ID and default activity ID
* Time entry validation
* Network failure behavior
* Clear user-facing status messages

Avoid requiring contributors or test runs to use a real Redmine account unless the change specifically needs real integration testing.

## Logs and Local Data

The app stores runtime data in Electron’s `userData` directory.

Examples include:

* Configuration and timer state
* Application logs

Do not commit local runtime data, logs, exported logs, screenshots, or personal Redmine configuration.

## Documentation Changes

Please update documentation when your change affects:

* Installation
* Configuration
* Usage
* Testing
* Redmine setup
* Security behavior
* Public project structure
* Available npm scripts

Documentation-only pull requests are welcome.

## Commit Messages

Use clear commit messages that explain what changed.

Recommended examples:

```text
fix: persist active timer after restart
feat: add log export filtering
docs: clarify Redmine API key setup
test: add settings save e2e scenario
refactor: simplify issue detail rendering
```

## Pull Request Checklist

Before opening a pull request, confirm that:

* The change is focused and easy to review.
* `npm install` completes successfully.
* `npm run lint` passes.
* Relevant tests pass.
* New behavior is covered by tests when practical.
* Documentation is updated when needed.
* No credentials, API keys, logs, screenshots, or local runtime files are committed.
* Security-sensitive changes have been reviewed carefully.

## Opening a Pull Request

When opening a pull request, include:

* A clear title
* A short summary of the change
* The reason for the change
* Steps used to test it
* Screenshots or logs when helpful
* Related issue numbers, if applicable

## Reporting Bugs

When reporting a bug, please include:

* A clear description of the problem
* Steps to reproduce it
* Expected behavior
* Actual behavior
* Your operating system
* Node.js and npm versions
* Redmine version, if relevant
* Screenshots or logs, if useful

Please remove or mask API keys, credentials, private URLs, issue data, and other sensitive information before sharing logs or screenshots.

## Suggesting Features

Feature suggestions are welcome.

Please include:

* What problem the feature solves
* How you expect it to work
* Any Redmine behavior or API details involved
* Alternatives you considered
* Screenshots, sketches, or examples when helpful

## License

By contributing to this project, you agree that your contribution will be licensed under the project’s license.
