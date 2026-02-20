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
