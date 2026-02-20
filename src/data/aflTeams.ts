export type JerseyPattern =
  | 'solid'
  | 'vertical-stripes'
  | 'horizontal-stripes'
  | 'sash'
  | 'hoops'
  | 'vee'
  | 'yoke';

export interface AFLTeamPreset {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor?: string;
  shortsColor: string;
  pattern: JerseyPattern;
}

export const AFL_TEAMS: AFLTeamPreset[] = [
  { id: 'adelaide', name: 'Adelaide Crows', abbreviation: 'ADL', primaryColor: '#002B5C', secondaryColor: '#FFD200', tertiaryColor: '#BE0000', shortsColor: '#002B5C', pattern: 'vertical-stripes' },
  { id: 'brisbane', name: 'Brisbane Lions', abbreviation: 'BRL', primaryColor: '#69003B', secondaryColor: '#FFD200', tertiaryColor: '#003EA1', shortsColor: '#69003B', pattern: 'sash' },
  { id: 'carlton', name: 'Carlton', abbreviation: 'CAR', primaryColor: '#002B5C', secondaryColor: '#FFFFFF', shortsColor: '#002B5C', pattern: 'solid' },
  { id: 'collingwood', name: 'Collingwood', abbreviation: 'COL', primaryColor: '#000000', secondaryColor: '#FFFFFF', shortsColor: '#000000', pattern: 'vertical-stripes' },
  { id: 'essendon', name: 'Essendon', abbreviation: 'ESS', primaryColor: '#000000', secondaryColor: '#CC0000', shortsColor: '#000000', pattern: 'sash' },
  { id: 'fremantle', name: 'Fremantle', abbreviation: 'FRE', primaryColor: '#2D0059', secondaryColor: '#FFFFFF', tertiaryColor: '#00AB6B', shortsColor: '#2D0059', pattern: 'vee' },
  { id: 'geelong', name: 'Geelong Cats', abbreviation: 'GEE', primaryColor: '#002B5C', secondaryColor: '#FFFFFF', shortsColor: '#FFFFFF', pattern: 'hoops' },
  { id: 'goldcoast', name: 'Gold Coast Suns', abbreviation: 'GCS', primaryColor: '#CC0000', secondaryColor: '#FFD200', shortsColor: '#CC0000', pattern: 'yoke' },
  { id: 'gws', name: 'GWS Giants', abbreviation: 'GWS', primaryColor: '#FF6600', secondaryColor: '#333333', tertiaryColor: '#FFFFFF', shortsColor: '#333333', pattern: 'solid' },
  { id: 'hawthorn', name: 'Hawthorn', abbreviation: 'HAW', primaryColor: '#4D2004', secondaryColor: '#FFD200', shortsColor: '#4D2004', pattern: 'horizontal-stripes' },
  { id: 'melbourne', name: 'Melbourne', abbreviation: 'MEL', primaryColor: '#002B5C', secondaryColor: '#CC0000', shortsColor: '#FFFFFF', pattern: 'vee' },
  { id: 'northmelbourne', name: 'North Melbourne', abbreviation: 'NM', primaryColor: '#003EA1', secondaryColor: '#FFFFFF', shortsColor: '#FFFFFF', pattern: 'vertical-stripes' },
  { id: 'portadelaide', name: 'Port Adelaide', abbreviation: 'PA', primaryColor: '#008AAB', secondaryColor: '#000000', tertiaryColor: '#FFFFFF', shortsColor: '#000000', pattern: 'vee' },
  { id: 'richmond', name: 'Richmond', abbreviation: 'RIC', primaryColor: '#000000', secondaryColor: '#FFD200', shortsColor: '#000000', pattern: 'sash' },
  { id: 'stkilda', name: 'St Kilda', abbreviation: 'STK', primaryColor: '#000000', secondaryColor: '#CC0000', tertiaryColor: '#FFFFFF', shortsColor: '#000000', pattern: 'horizontal-stripes' },
  { id: 'sydney', name: 'Sydney Swans', abbreviation: 'SYD', primaryColor: '#CC0000', secondaryColor: '#FFFFFF', shortsColor: '#CC0000', pattern: 'vee' },
  { id: 'westcoast', name: 'West Coast Eagles', abbreviation: 'WCE', primaryColor: '#002B5C', secondaryColor: '#FFD200', shortsColor: '#002B5C', pattern: 'yoke' },
  { id: 'westernbulldogs', name: 'Western Bulldogs', abbreviation: 'WBD', primaryColor: '#002B5C', secondaryColor: '#CC0000', tertiaryColor: '#FFFFFF', shortsColor: '#FFFFFF', pattern: 'hoops' },
];

export function getTeamById(id: string): AFLTeamPreset | undefined {
  return AFL_TEAMS.find(t => t.id === id);
}
