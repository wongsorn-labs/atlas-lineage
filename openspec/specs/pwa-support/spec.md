# pwa-support Specification

## Purpose
Make the web app installable and resilient offline via a web manifest and an auto-updating precaching service worker.
## Requirements
### Requirement: Installable Web App Manifest
The system SHALL expose a web app manifest identifying Atlas Lineage as an installable, standalone-display PWA.

#### Scenario: Manifest served with app metadata
- **WHEN** the built web app is loaded in a browser
- **THEN** the manifest declares name "Atlas Lineage", short name "Atlas", theme color `#1e40af`, `display: standalone`, and 192x192 / 512x512 icons (the 512 icon marked `purpose: any maskable`)

### Requirement: Service Worker Auto-Registration and Update
The system SHALL register a service worker on load and automatically activate updates without requiring manual user action.

#### Scenario: Service worker registers on app start
- **WHEN** the web app boots
- **THEN** `registerSW({ immediate: true })` registers the Workbox-generated service worker immediately

#### Scenario: New version deployed
- **WHEN** a new build is deployed and the service worker detects an update
- **THEN** the app is configured with `registerType: 'autoUpdate'`, so the new service worker activates automatically rather than waiting for a manual reload prompt

### Requirement: Static Asset Precaching
The system SHALL precache the app's static assets so the app shell is available offline after first load.

#### Scenario: Build-time asset globbing
- **WHEN** the PWA plugin builds the service worker
- **THEN** it precaches all matching `**/*.{js,css,html,ico,png,svg,woff2}` assets per the configured Workbox `globPatterns`

