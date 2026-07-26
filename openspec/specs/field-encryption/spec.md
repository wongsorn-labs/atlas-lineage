# field-encryption Specification

## Purpose
Protect sensitive person fields (`birthPlace`, `notes`) at rest using AES-256-GCM, transparent to callers of the persons queries.
## Requirements
### Requirement: Encrypt Sensitive Person Fields At Rest
The system SHALL encrypt the `birthPlace` and `notes` fields of every person using AES-256-GCM before persisting them, and SHALL decrypt them on read.

#### Scenario: Encrypted storage format
- **WHEN** a person is created or updated with a non-empty `birthPlace` or `notes` value
- **THEN** the system encrypts the value with AES-256-GCM using a random 16-byte IV, and stores it as a colon-delimited hex string in the form `iv:authTag:ciphertext`

#### Scenario: Decryption on read
- **WHEN** a person record with encrypted `birthPlace`/`notes` is read
- **THEN** the system decrypts the stored value using `ENCRYPTION_KEY` and returns the original plaintext to the caller

### Requirement: Null and Empty Values Bypass Encryption
The system SHALL store null and empty-string values for `birthPlace`/`notes` as SQL NULL without attempting encryption.

#### Scenario: Empty string stored as null
- **WHEN** a person is created or updated with `birthPlace` or `notes` set to `null` or `""`
- **THEN** the system stores SQL NULL for that column rather than an encrypted blob

### Requirement: Missing Encryption Key Fails Loudly
The system SHALL require the `ENCRYPTION_KEY` environment variable to be present whenever a person record is read or written, and SHALL fail rather than silently store or return plaintext.

#### Scenario: Key not configured
- **WHEN** `ENCRYPTION_KEY` is not set in the environment and a person query function is invoked
- **THEN** the system throws an error before performing the read or write

### Requirement: Decryption Failure Returns Null
The system SHALL treat a value that fails to decrypt (e.g. corrupted ciphertext or wrong key) as absent rather than raising an error to the caller.

#### Scenario: Corrupted ciphertext
- **WHEN** a stored `birthPlace` or `notes` value cannot be decrypted with the current `ENCRYPTION_KEY` (e.g. auth tag mismatch)
- **THEN** the system returns `null` for that field instead of throwing

