export interface AFLPosition {
  code: string;
  name: string;
}

export const AFL_POSITIONS: AFLPosition[] = [
  { code: 'FB', name: 'Full Back' },
  { code: 'BP', name: 'Back Pocket' },
  { code: 'CHB', name: 'Centre Half Back' },
  { code: 'HBF', name: 'Half Back Flank' },
  { code: 'W', name: 'Wing' },
  { code: 'C', name: 'Centre' },
  { code: 'RK', name: 'Ruck' },
  { code: 'RR', name: 'Ruck Rover' },
  { code: 'R', name: 'Rover' },
  { code: 'CHF', name: 'Centre Half Forward' },
  { code: 'HFF', name: 'Half Forward Flank' },
  { code: 'FP', name: 'Forward Pocket' },
  { code: 'FF', name: 'Full Forward' },
  { code: 'INT', name: 'Interchange' },
];

export const AFL_POSITION_CODES = AFL_POSITIONS.map(p => p.code);

export function getPositionByCode(code: string): AFLPosition | undefined {
  return AFL_POSITIONS.find(p => p.code.toUpperCase() === code.toUpperCase());
}

/**
 * Maps standard jersey numbers 1-22 to default AFL field positions.
 * Used for auto-assigning positions based on jersey number.
 */
export const NUMBER_TO_POSITION: Record<number, string> = {
  1: 'FB',
  2: 'BP',
  3: 'BP',
  4: 'CHB',
  5: 'HBF',
  6: 'HBF',
  7: 'W',
  8: 'W',
  9: 'C',
  10: 'RK',
  11: 'RR',
  12: 'R',
  13: 'CHF',
  14: 'HFF',
  15: 'HFF',
  16: 'FF',
  17: 'FP',
  18: 'FP',
  19: 'INT',
  20: 'INT',
  21: 'INT',
  22: 'INT',
};
