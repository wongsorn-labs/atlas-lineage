## ADDED Requirements

### Requirement: Render Person Markers on a World Map
The system SHALL render a marker for every person who has both a non-null `birthLat` and `birthLng`, and SHALL omit persons missing either coordinate.

#### Scenario: Person with coordinates is mappable
- **WHEN** the map loads and a person has both `birthLat` and `birthLng` set
- **THEN** a marker for that person is rendered on the Leaflet map at those coordinates

#### Scenario: Person without coordinates is not mappable
- **WHEN** a person has a null `birthLat` or `birthLng`
- **THEN** no marker is rendered for that person, but the person still appears in the sidebar list

### Requirement: Draw Relationship Lines Between Mappable Persons
The system SHALL draw a colored polyline between two persons' markers for every relationship where both persons have coordinates, and SHALL skip relationships where either person lacks coordinates.

#### Scenario: Both endpoints mappable
- **WHEN** a relationship connects two persons who both have birth coordinates
- **THEN** the map draws a `Polyline` between their marker positions, colored according to the relationship `type` (parent=green, child=blue, sibling=yellow, spouse=pink, partner=purple)

#### Scenario: One endpoint not mappable
- **WHEN** a relationship connects a person with coordinates to a person without coordinates
- **THEN** no line is drawn for that relationship

### Requirement: Marker Selection Syncs With Sidebar
The system SHALL keep the selected person synchronized between the map and the sidebar list.

#### Scenario: Selecting a marker highlights it and updates the sidebar
- **WHEN** a user clicks a person's marker on the map
- **THEN** that marker is visually marked as selected and the corresponding sidebar entry reflects the same selection

#### Scenario: Selected person is deleted or filtered out
- **WHEN** the currently selected person is no longer present in the loaded persons list
- **THEN** the selection is cleared automatically

### Requirement: Leaflet Default Icon Path Fix
The system SHALL override Leaflet's default marker icon URL resolution so that marker icons load correctly under the Vite bundler.

#### Scenario: App loads with working default icons
- **WHEN** the web app initializes `MapView`
- **THEN** it deletes `L.Icon.Default.prototype._getIconUrl` and calls `L.Icon.Default.mergeOptions` with Vite-resolved asset URLs, so default markers render without broken image icons
