## ADDED Requirements

### Requirement: English and Thai Translations
The system SHALL provide UI translations for English (`en`) and Thai (`th`) via `react-i18next`, loaded from static locale JSON files.

#### Scenario: Translation key resolves in active language
- **WHEN** a component renders text via the `t()` translation function
- **THEN** the string is resolved from `apps/web/src/i18n/locales/en.json` or `th.json` according to the active language

### Requirement: Persisted Language Preference
The system SHALL remember the user's selected language across sessions using `localStorage`.

#### Scenario: Language chosen previously
- **WHEN** the app initializes and `localStorage['lang']` holds a previously saved language code
- **THEN** i18next initializes with that language as the active `lng`

#### Scenario: No stored preference
- **WHEN** the app initializes and no `lang` value exists in `localStorage`
- **THEN** i18next defaults to English (`en`) as both the initial and fallback language
