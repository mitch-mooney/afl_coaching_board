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
  // Adelaide: navy body, gold+red stripes — keep navy dominant, tertiary red adds distinction
  { id: 'adelaide', name: 'Adelaide Crows', abbreviation: 'ADL', primaryColor: '#002B5C', secondaryColor: '#FFD200', tertiaryColor: '#BE0000', shortsColor: '#002B5C', pattern: 'vertical-stripes' },
  // Brisbane: maroon body, gold sash
  { id: 'brisbane', name: 'Brisbane Lions', abbreviation: 'BRL', primaryColor: '#69003B', secondaryColor: '#FFD200', tertiaryColor: '#003EA1', shortsColor: '#69003B', pattern: 'sash' },
  // Carlton: solid navy — simple, distinct
  { id: 'carlton', name: 'Carlton', abbreviation: 'CAR', primaryColor: '#002B5C', secondaryColor: '#FFFFFF', shortsColor: '#002B5C', pattern: 'solid' },
  // Collingwood: white body, black stripes — flipped so they appear white not black
  { id: 'collingwood', name: 'Collingwood', abbreviation: 'COL', primaryColor: '#FFFFFF', secondaryColor: '#000000', shortsColor: '#000000', pattern: 'vertical-stripes' },
  // Essendon: black body, red sash
  { id: 'essendon', name: 'Essendon', abbreviation: 'ESS', primaryColor: '#000000', secondaryColor: '#CC0000', shortsColor: '#000000', pattern: 'sash' },
  // Fremantle: deep purple body, white+green vee
  { id: 'fremantle', name: 'Fremantle', abbreviation: 'FRE', primaryColor: '#2D0059', secondaryColor: '#FFFFFF', tertiaryColor: '#00AB6B', shortsColor: '#2D0059', pattern: 'vee' },
  // Geelong: navy/white hoops — keep navy, pattern distinguishes from Carlton
  { id: 'geelong', name: 'Geelong Cats', abbreviation: 'GEE', primaryColor: '#002B5C', secondaryColor: '#FFFFFF', shortsColor: '#FFFFFF', pattern: 'hoops' },
  // Gold Coast: red body, gold yoke
  { id: 'goldcoast', name: 'Gold Coast Suns', abbreviation: 'GCS', primaryColor: '#CC0000', secondaryColor: '#FFD200', shortsColor: '#CC0000', pattern: 'yoke' },
  // GWS: orange body — very distinctive
  { id: 'gws', name: 'GWS Giants', abbreviation: 'GWS', primaryColor: '#FF6600', secondaryColor: '#333333', tertiaryColor: '#FFFFFF', shortsColor: '#333333', pattern: 'solid' },
  // Hawthorn: brown/gold horizontal stripes
  { id: 'hawthorn', name: 'Hawthorn', abbreviation: 'HAW', primaryColor: '#4D2004', secondaryColor: '#FFD200', shortsColor: '#4D2004', pattern: 'horizontal-stripes' },
  // Melbourne: RED primary (Demons are red) with navy vee — swapped from navy to red so they don't clash with Carlton/Geelong/etc
  { id: 'melbourne', name: 'Melbourne', abbreviation: 'MEL', primaryColor: '#CC0000', secondaryColor: '#002B5C', shortsColor: '#FFFFFF', pattern: 'vee' },
  // North Melbourne: royal blue, white stripes
  { id: 'northmelbourne', name: 'North Melbourne', abbreviation: 'NM', primaryColor: '#003EA1', secondaryColor: '#FFFFFF', shortsColor: '#FFFFFF', pattern: 'vertical-stripes' },
  // Port Adelaide: teal/cyan body, black+white vee — distinctive colour
  { id: 'portadelaide', name: 'Port Adelaide', abbreviation: 'PA', primaryColor: '#008AAB', secondaryColor: '#000000', tertiaryColor: '#FFFFFF', shortsColor: '#000000', pattern: 'vee' },
  // Richmond: YELLOW primary (Tigers are yellow) with black sash — flipped so they appear gold not black, clearly distinct from Essendon
  { id: 'richmond', name: 'Richmond', abbreviation: 'RIC', primaryColor: '#FFD200', secondaryColor: '#000000', shortsColor: '#000000', pattern: 'sash' },
  // St Kilda: red primary, black+white horizontal stripes — red dominant so they don't clash with Essendon's black
  { id: 'stkilda', name: 'St Kilda', abbreviation: 'STK', primaryColor: '#CC0000', secondaryColor: '#000000', tertiaryColor: '#FFFFFF', shortsColor: '#000000', pattern: 'horizontal-stripes' },
  // Sydney: red body, white vee
  { id: 'sydney', name: 'Sydney Swans', abbreviation: 'SYD', primaryColor: '#CC0000', secondaryColor: '#FFFFFF', shortsColor: '#CC0000', pattern: 'vee' },
  // West Coast: gold primary, navy yoke — flipped so they appear gold/yellow not navy (avoids clash with Carlton/Geelong)
  { id: 'westcoast', name: 'West Coast Eagles', abbreviation: 'WCE', primaryColor: '#FFD200', secondaryColor: '#002B5C', shortsColor: '#002B5C', pattern: 'yoke' },
  // Western Bulldogs: red primary, navy+white hoops — red dominant to distinguish from navy teams
  { id: 'westernbulldogs', name: 'Western Bulldogs', abbreviation: 'WBD', primaryColor: '#CC0000', secondaryColor: '#002B5C', tertiaryColor: '#FFFFFF', shortsColor: '#FFFFFF', pattern: 'hoops' },
];

export function getTeamById(id: string): AFLTeamPreset | undefined {
  return AFL_TEAMS.find(t => t.id === id);
}
