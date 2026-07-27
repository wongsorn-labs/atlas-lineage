export interface CountryMapDefault {
  code: string;
  name: string;
  center: [number, number];
  zoom: number;
}

export const COUNTRY_MAP_DEFAULTS: CountryMapDefault[] = [
  { code: 'THA', name: 'Thailand', center: [15.87, 100.9925], zoom: 6 },
  { code: 'USA', name: 'United States', center: [39.8283, -98.5795], zoom: 4 },
  { code: 'GBR', name: 'United Kingdom', center: [54.0, -2.0], zoom: 5 },
  { code: 'JPN', name: 'Japan', center: [36.2048, 138.2529], zoom: 5 },
  { code: 'DEU', name: 'Germany', center: [51.1657, 10.4515], zoom: 5 },
  { code: 'FRA', name: 'France', center: [46.6034, 1.8883], zoom: 5 },
  { code: 'CHN', name: 'China', center: [35.8617, 104.1954], zoom: 4 },
  { code: 'IND', name: 'India', center: [20.5937, 78.9629], zoom: 4 },
  { code: 'AUS', name: 'Australia', center: [-25.2744, 133.7751], zoom: 4 },
  { code: 'BRA', name: 'Brazil', center: [-14.235, -51.9253], zoom: 4 },
  { code: 'CAN', name: 'Canada', center: [56.1304, -106.3468], zoom: 3 },
  { code: 'SGP', name: 'Singapore', center: [1.3521, 103.8198], zoom: 10 },
  { code: 'VNM', name: 'Vietnam', center: [14.0583, 108.2772], zoom: 5 },
  { code: 'KOR', name: 'South Korea', center: [35.9078, 127.7669], zoom: 6 },
];

const WORLD_DEFAULT: CountryMapDefault = { code: '', name: 'World', center: [20, 0], zoom: 2 };

export function getCountryMapDefault(code: string | null | undefined): CountryMapDefault {
  return COUNTRY_MAP_DEFAULTS.find((c) => c.code === code) ?? WORLD_DEFAULT;
}
