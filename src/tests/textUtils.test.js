import { normalizeText, flexibleSearch, searchInObject } from '../utils/textUtils';

describe('normalizeText', () => {
  test('normalizes text with accents to lowercase without diacritics', () => {
    expect(normalizeText('José María')).toBe('jose maria');
  });

  test('normalizes text with various accents', () => {
    expect(normalizeText('Árbol Niño Corazón')).toBe('arbol nino corazon');
  });

  test('returns empty string for null input', () => {
    expect(normalizeText(null)).toBe('');
  });

  test('returns empty string for undefined input', () => {
    expect(normalizeText(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  test('returns empty string for non-string input', () => {
    expect(normalizeText(123)).toBe('');
  });

  test('trims whitespace', () => {
    expect(normalizeText('  hola  ')).toBe('hola');
  });

  test('converts to lowercase', () => {
    expect(normalizeText('HELLO')).toBe('hello');
  });

  test('handles text without accents', () => {
    expect(normalizeText('Hello World')).toBe('hello world');
  });

  test('handles ñ as regular n', () => {
    // NFD decomposition converts ñ to n + combining tilde, which gets stripped
    expect(normalizeText('añaño')).toBe('anano');
  });
});

describe('flexibleSearch', () => {
  test('returns true when search term is found in fields', () => {
    expect(flexibleSearch('jose', ['José María', 'Ana Sofía'])).toBe(true);
  });

  test('returns true for empty search term', () => {
    expect(flexibleSearch('', ['José', 'Ana'])).toBe(true);
  });

  test('returns true for null search term', () => {
    expect(flexibleSearch(null, ['José', 'Ana'])).toBe(true);
  });

  test('returns true for undefined search term', () => {
    expect(flexibleSearch(undefined, ['José', 'Ana'])).toBe(true);
  });

  test('returns true for empty fields array', () => {
    expect(flexibleSearch('jose', [])).toBe(true);
  });

  test('returns false when search term is not found', () => {
    expect(flexibleSearch('pedro', ['José', 'Ana'])).toBe(false);
  });

  test('handles null fields in array', () => {
    expect(flexibleSearch('jose', [null, 'José'])).toBe(true);
  });

  test('handles undefined fields in array', () => {
    expect(flexibleSearch('jose', [undefined, 'José'])).toBe(true);
  });

  test('performs accent-insensitive search', () => {
    expect(flexibleSearch('garcia', ['García', 'López'])).toBe(true);
  });

  test('performs case-insensitive search', () => {
    expect(flexibleSearch('ANA', ['Ana María', 'José'])).toBe(true);
  });
});

describe('searchInObject', () => {
  const patient = { name: 'José', last_name: 'García', health_insurance: 'OSDE' };

  test('returns true when search term matches a field', () => {
    // 'jose garcia' matches because both 'jose' and 'garcia' are found in separate fields
    expect(searchInObject('jose', patient, ['name', 'last_name'])).toBe(true);
    expect(searchInObject('garcia', patient, ['name', 'last_name'])).toBe(true);
  });

  test('returns true for partial match', () => {
    expect(searchInObject('jose', patient, ['name', 'last_name'])).toBe(true);
  });

  test('returns true for match in specific field', () => {
    expect(searchInObject('osde', patient, ['health_insurance'])).toBe(true);
  });

  test('returns true when search term is empty', () => {
    expect(searchInObject('', patient, ['name'])).toBe(true);
  });

  test('returns true when search term is null', () => {
    expect(searchInObject(null, patient, ['name'])).toBe(true);
  });

  test('returns true when item is null', () => {
    expect(searchInObject('test', null, ['name'])).toBe(true);
  });

  test('returns false when no match found', () => {
    expect(searchInObject('perez', patient, ['name', 'last_name'])).toBe(false);
  });

  test('handles nested fields with dot notation', () => {
    const item = { address: { city: 'Buenos Aires' } };
    expect(searchInObject('buenos', item, ['address.city'])).toBe(true);
  });

  test('handles undefined nested fields', () => {
    const item = { name: 'Test' };
    expect(searchInObject('test', item, ['address.city'])).toBe(false);
  });

  test('handles null nested values', () => {
    const item = { address: null };
    expect(searchInObject('test', item, ['address.city'])).toBe(false);
  });
});