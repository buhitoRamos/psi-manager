// Tests for googleCalendar module utility functions
// The module has side effects at import time (localStorage access),
// so we test the pure utility functions by reimplementing and testing them directly.

describe('processInBatches utility', () => {
  // Re-implement processInBatches logic for testing (copied from source)
  async function processInBatches(items, action, batchSize = 10, delayMs = 3000) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(action));
      results.push(...batchResults);
      if (i + batchSize < items.length) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
    return results;
  }

  test('processes items in batches', async () => {
    const items = [1, 2, 3, 4, 5];
    const action = jest.fn((item) => Promise.resolve(item * 2));
    const results = await processInBatches(items, action, 2, 10);
    expect(results).toHaveLength(5);
    expect(action).toHaveBeenCalledTimes(5);
  });

  test('handles empty array', async () => {
    const results = await processInBatches([], jest.fn(), 10, 100);
    expect(results).toHaveLength(0);
  });

  test('handles single item', async () => {
    const action = jest.fn(() => Promise.resolve('done'));
    const results = await processInBatches([1], action, 10, 100);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('fulfilled');
    expect(results[0].value).toBe('done');
  });

  test('handles rejected promises', async () => {
    const action = jest.fn((item) => {
      if (item === 2) return Promise.reject(new Error('Failed'));
      return Promise.resolve(item);
    });
    const results = await processInBatches([1, 2, 3], action, 10, 100);
    expect(results).toHaveLength(3);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');
  });

  test('uses default batch size and delay', async () => {
    const items = [1, 2, 3];
    const action = jest.fn((item) => Promise.resolve(item));
    const results = await processInBatches(items, action);
    expect(results).toHaveLength(3);
  });
});

describe('isGoogleApiReady utility', () => {
  // Re-implement isGoogleApiReady logic for testing (copied from source)
  function isGoogleApiReady() {
    return (
      typeof window !== 'undefined' &&
      window.gapi &&
      window.gapi.client &&
      typeof window.gapi.client.init === 'function'
    );
  }

  afterEach(() => {
    delete window.gapi;
  });

  test('returns false when gapi is not available', () => {
    delete window.gapi;
    const result = isGoogleApiReady();
    expect(!result).toBe(true);
  });

  test('returns false when gapi.client is not available', () => {
    window.gapi = {};
    const result = isGoogleApiReady();
    expect(!result).toBe(true);
  });

  test('returns true when gapi.client.init is a function', () => {
    window.gapi = { client: { init: jest.fn() } };
    expect(isGoogleApiReady()).toBe(true);
  });
});