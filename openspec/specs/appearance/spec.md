# appearance Specification

## Purpose
Let users control how the app looks and where the map opens: a light/dark visual theme and a default map country/view, both persisted per user.

## Requirements

### Requirement: Light/Dark Theme Toggle
The system SHALL let the user switch between a light and dark visual theme, SHALL default to the OS `prefers-color-scheme` when no explicit choice has been made, and SHALL persist an explicit choice across sessions.

#### Scenario: First visit follows OS preference
- **WHEN** a user opens the app with no theme previously chosen
- **THEN** the app renders in dark mode if the OS reports `prefers-color-scheme: dark`, and in light mode otherwise

#### Scenario: User toggles theme
- **WHEN** a user clicks the theme toggle in the Sidebar header
- **THEN** the app switches between light and dark immediately, the choice is saved to `localStorage`, and the map's tile layer switches between CARTO `light_all` and `dark_all` to match

#### Scenario: Returning with an explicit choice
- **WHEN** a user who previously toggled the theme reopens the app, regardless of the current OS preference
- **THEN** the app renders in their last explicitly chosen theme, not the OS default

#### Scenario: No flash of the wrong theme
- **WHEN** the app's HTML is first parsed, before React hydrates
- **THEN** a pre-hydration script in `index.html` reads the persisted theme and sets `data-theme` on `<html>` synchronously, so the initial paint already matches the chosen theme

### Requirement: Default Map Country
The system SHALL let a signed-in user choose a default country for the map to open on, SHALL persist it to their account (not just the browser), and SHALL fall back to a world view when unset.

#### Scenario: User sets a default country
- **WHEN** a user picks a country from the Settings dialog's "Default map country" select
- **THEN** the web app calls `PATCH /api/auth/profile` with the country's ISO 3166-1 alpha-3 code, the system persists it to `profiles.default_country`, and the map immediately re-centers to that country's configured coordinates and zoom

#### Scenario: User clears the default country
- **WHEN** a user selects "World" in the Settings dialog
- **THEN** the system persists `default_country` as `null`, and the map falls back to the world view (center `[20, 0]`, zoom `2`)

#### Scenario: Returning user sees their default country
- **WHEN** a user with a saved `default_country` signs in on any device
- **THEN** `GET /api/auth/me` returns their `defaultCountry`, and `MapView` opens centered on that country instead of the world view

#### Scenario: Unrecognized or unset country code
- **WHEN** `defaultCountry` is `null` or does not match any entry in the app's country-to-coordinates table
- **THEN** the map falls back to the world view rather than erroring
