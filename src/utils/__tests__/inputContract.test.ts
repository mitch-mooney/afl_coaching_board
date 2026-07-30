import { describe, it, expect } from 'vitest';
import { authoringIntent } from '../inputContract';

describe('the input contract', () => {
  it('has a finger manipulate even when a tip is armed', () => {
    expect(authoringIntent({ pointerType: 'touch', armedTip: 'arrow' })).toBe('manipulate');
  });

  it('has a pen with no tip armed behave as a finger', () => {
    expect(authoringIntent({ pointerType: 'pen', armedTip: null })).toBe('manipulate');
  });

  it('has a pen with a tip armed author', () => {
    expect(authoringIntent({ pointerType: 'pen', armedTip: 'arrow' })).toBe('author');
  });

  it('has a mouse with a tip armed author, so the desktop board still draws', () => {
    expect(authoringIntent({ pointerType: 'mouse', armedTip: 'arrow', button: 0 })).toBe('author');
  });

  it('never authors from a non-primary mouse button, so right-drag still rotates', () => {
    expect(authoringIntent({ pointerType: 'mouse', armedTip: 'line', button: 2 })).toBe(
      'manipulate'
    );
  });
});
