import { test, expect } from 'vitest';
import { removeAmpersandFromCode } from '../../lib/stations';

test('removeAmpersandFromCode strips & and maps known codes', () => {
    expect(removeAmpersandFromCode('&KH')).toBe('København H');
    expect(removeAmpersandFromCode('KH')).toBe('København H');
});

test('removeAmpersandFromCode falls back to lowercased code when unknown', () => {
    expect(removeAmpersandFromCode('&XX')).toBe('xx');
    expect(removeAmpersandFromCode('AbC')).toBe('abc');
});
