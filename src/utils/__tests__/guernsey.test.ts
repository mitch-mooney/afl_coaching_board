import { describe, it, expect } from 'vitest';
import { getTeamById } from '../../data/aflTeams';
import { palette } from '../../theme/tokens';
import { createTeamPlayers, DEFAULT_TEAM_COLORS } from '../../models/PlayerModel';
import { boardGuernseys, teamGuernseys, type TeamKit } from '../guernsey';

/** A club's kit. The colour is what its players carry, the preset's primary. */
const club = (presetId: string): TeamKit => ({ presetId, color: getTeamById(presetId)!.primaryColor });

describe('boardGuernseys: what the players on the board wear', () => {
  it('reads each team from its players, so a Carlton intra-club board puts Team 2 in the clash', () => {
    const players = [
      ...createTeamPlayers('team1', '#002B5C', 2).map((p) => ({ ...p, teamPresetId: 'carlton' })),
      ...createTeamPlayers('team2', '#002B5C', 2).map((p) => ({ ...p, teamPresetId: 'carlton' })),
    ];
    const { team1, team2 } = boardGuernseys(players);
    expect(team1).toMatchObject({ body: '#002B5C', clash: false });
    expect(team2).toMatchObject({ body: '#FFFFFF', patternColours: ['#002B5C'], clash: true });
  });

  it('dresses a team with no players on the board in its default colour', () => {
    const players = createTeamPlayers('team1', '#0066cc', 2);
    expect(boardGuernseys(players).team2).toMatchObject({ body: DEFAULT_TEAM_COLORS.team2, clash: false });
  });
});

describe('teamGuernseys: the clubs in their real home guernseys', () => {
  // Against a club that clashes with none of them, so each wears its own.
  const alone = (presetId: string) => teamGuernseys({ color: '#00A651' }, club(presetId)).team2;

  it('puts Melbourne in navy with a red yoke', () => {
    expect(alone('melbourne')).toMatchObject({ body: '#0F1131', pattern: 'yoke', patternColours: ['#CC2031'], clash: false });
  });

  it('puts West Coast in royal blue with gold', () => {
    expect(alone('westcoast')).toMatchObject({ body: '#003087', pattern: 'yoke', patternColours: ['#F2A900'], clash: false });
  });

  it('puts Collingwood in black with white stripes', () => {
    expect(alone('collingwood')).toMatchObject({
      body: '#000000',
      pattern: 'vertical-stripes',
      patternColours: ['#FFFFFF'],
      clash: false,
    });
  });

  it('puts St Kilda in black with its red and white panels', () => {
    expect(alone('stkilda')).toMatchObject({
      body: '#000000',
      pattern: 'vertical-stripes',
      patternColours: ['#FFFFFF', '#ED0F05'],
      clash: false,
    });
  });
});

describe('teamGuernseys: a club playing itself', () => {
  it('puts Team 2 in the Clash guernsey and leaves Team 1 in its own', () => {
    const { team1, team2 } = teamGuernseys(club('carlton'), club('carlton'));
    expect(team1).toMatchObject({ body: '#002B5C', clash: false });
    expect(team2.clash).toBe(true);
    expect(team2.body).not.toBe('#002B5C');
  });
});

describe('teamGuernseys: the Clash guernsey', () => {
  it('turns a dark guernsey white, with the pattern in the club colour', () => {
    expect(teamGuernseys(club('carlton'), club('geelong')).team2).toEqual(
      expect.objectContaining({ body: '#FFFFFF', pattern: 'hoops', patternColours: ['#002B5C'], clash: true }),
    );
  });

  it('turns a light guernsey Concrete, with the pattern in the club colour', () => {
    expect(teamGuernseys(club('sydney'), club('sydney')).team2).toEqual(
      expect.objectContaining({ body: palette.concrete, pattern: 'yoke', patternColours: ['#FFFFFF'], clash: true }),
    );
  });

  it('takes the other body colour when white would still clash with Team 1', () => {
    // Two pale greys: Team 2's is just dark enough to turn white, which sits
    // too close to Team 1's.
    const { team2 } = teamGuernseys({ color: '#C6C6C6' }, { color: '#B8B8B8' });
    expect(team2).toMatchObject({ body: palette.concrete, patternColours: ['#B8B8B8'], clash: true });
  });

  it('flips a custom team by the same rule, keeping it solid', () => {
    const { team1, team2 } = teamGuernseys({ color: '#cc0000' }, { color: '#d01010' });
    expect(team1).toMatchObject({ body: '#cc0000', clash: false });
    expect(team2).toMatchObject({ body: '#FFFFFF', pattern: 'solid', patternColours: ['#d01010'], clash: true });
  });
});

describe('teamGuernseys: the token label', () => {
  it('is Chalk on a dark guernsey and Concrete on a light one', () => {
    const { team1, team2 } = teamGuernseys(club('carlton'), club('sydney'));
    expect(team1.label).toBe(palette.chalk);
    expect(team2.label).toBe(palette.concrete);
  });

  it('follows the Clash guernsey body, not the home one', () => {
    expect(teamGuernseys(club('carlton'), club('carlton')).team2.label).toBe(palette.concrete);
    expect(teamGuernseys(club('sydney'), club('sydney')).team2.label).toBe(palette.chalk);
  });
});

describe('teamGuernseys: two clubs that look alike', () => {
  it('counts Carlton and Geelong as a clash, though Geelong wears hoops', () => {
    expect(teamGuernseys(club('carlton'), club('geelong')).team2.clash).toBe(true);
  });

  it('counts Melbourne and Carlton as a clash, both being navy', () => {
    expect(teamGuernseys(club('carlton'), club('melbourne')).team2.clash).toBe(true);
  });

  it('counts two black guernseys as a clash, whatever is drawn over them', () => {
    expect(teamGuernseys(club('essendon'), club('collingwood')).team2.clash).toBe(true);
    expect(teamGuernseys(club('collingwood'), club('stkilda')).team2.clash).toBe(true);
    expect(teamGuernseys(club('richmond'), club('portadelaide')).team2.clash).toBe(true);
  });

  it('counts two royal blues as a clash', () => {
    expect(teamGuernseys(club('northmelbourne'), club('westcoast')).team2.clash).toBe(true);
    expect(teamGuernseys(club('westcoast'), club('westernbulldogs')).team2.clash).toBe(true);
  });

  it('judges closeness by eye, not by RGB distance', () => {
    // RGB puts these two yellows (80 apart) about as far apart as navy and
    // bottle green (84), yet the yellows look the same and navy and green don't.
    expect(teamGuernseys({ color: '#FFFF00' }, { color: '#FFFF50' }).team2.clash).toBe(true);
    expect(teamGuernseys({ color: '#002B5C' }, { color: '#1E6B2E' }).team2.clash).toBe(false);
  });

  it('leaves a clearly different pair in their own guernseys', () => {
    const { team1, team2 } = teamGuernseys(club('carlton'), club('goldcoast'));
    expect(team1).toMatchObject({ body: '#002B5C', clash: false });
    expect(team2).toMatchObject({ body: '#CC0000', pattern: 'solid', patternColours: ['#FFD200'], clash: false });
  });

  it('leaves the default blue and red teams alone', () => {
    const { team2 } = teamGuernseys({ color: '#0066cc' }, { color: '#cc0000' });
    expect(team2).toMatchObject({ body: '#cc0000', pattern: 'solid', clash: false });
  });
});

describe("teamGuernseys: the coach's override for Team 2", () => {
  it('Auto wears the clash when the teams clash, and says so', () => {
    const wears = teamGuernseys(club('carlton'), club('carlton'), 'auto');
    expect(wears.team2.clash).toBe(true);
    expect(wears.auto).toBe('clash');
    expect(wears.decidedBy).toBe('auto');
  });

  it('Auto wears home when the teams are clear, and says so', () => {
    const wears = teamGuernseys(club('carlton'), club('richmond'), 'auto');
    expect(wears.team2).toMatchObject({ body: '#FFD200', clash: false });
    expect(wears.auto).toBe('home');
  });

  it('is Auto when no override is given', () => {
    expect(teamGuernseys(club('carlton'), club('carlton')).decidedBy).toBe('auto');
  });

  it('Clash forces the Clash guernsey on teams Auto would leave alone', () => {
    const wears = teamGuernseys(club('carlton'), club('richmond'), 'clash');
    expect(wears.team2).toMatchObject({
      body: palette.concrete,
      pattern: 'sash',
      patternColours: ['#FFD200'],
      clash: true,
    });
    expect(wears.auto).toBe('home');
    expect(wears.decidedBy).toBe('override');
  });

  it('Home keeps the home guernsey on teams Auto would change', () => {
    const wears = teamGuernseys(club('carlton'), club('carlton'), 'home');
    expect(wears.team2).toMatchObject({ body: '#002B5C', clash: false, label: palette.chalk });
    expect(wears.auto).toBe('clash');
    expect(wears.decidedBy).toBe('override');
  });

  it('never changes Team 1', () => {
    for (const override of ['auto', 'clash', 'home'] as const) {
      expect(teamGuernseys(club('carlton'), club('carlton'), override).team1).toMatchObject({
        body: '#002B5C',
        clash: false,
      });
    }
  });

  it('reaches the board through boardGuernseys', () => {
    const players = [
      ...createTeamPlayers('team1', '#002B5C', 2).map((p) => ({ ...p, teamPresetId: 'carlton' })),
      ...createTeamPlayers('team2', '#002B5C', 2).map((p) => ({ ...p, teamPresetId: 'carlton' })),
    ];
    expect(boardGuernseys(players, 'home').team2.clash).toBe(false);
    expect(boardGuernseys(players).team2.clash).toBe(true);
  });
});
