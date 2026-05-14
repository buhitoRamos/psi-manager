import { getAuthStatusByUserId } from '../lib/authStatusRest';

// Mock global fetch
global.fetch = jest.fn();

describe('authStatusRest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
    process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.REACT_APP_SUPABASE_URL;
    delete process.env.REACT_APP_SUPABASE_ANON_KEY;
  });

  test('getAuthStatusByUserId returns auth status when found via RPC', async () => {
    const mockData = { id: 1, user_id: 123, status: true };
    // RPC call returns data
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      text: async () => '',
      status: 200,
    });

    const result = await getAuthStatusByUserId('123');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('getAuthStatusByUserId falls back to REST when RPC fails', async () => {
    // RPC call fails
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('RPC error'); },
      text: async () => 'Internal Server Error',
    });
    // REST fallback returns data
    const mockData = [{ id: 1, user_id: 123, status: true }];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      text: async () => '',
      status: 200,
    });

    const result = await getAuthStatusByUserId('123');
    expect(result).toEqual(mockData[0]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('getAuthStatusByUserId returns null when no data found', async () => {
    // RPC returns empty
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
      text: async () => '',
      status: 200,
    });
    // REST fallback also returns empty
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
      text: async () => '',
      status: 200,
    });

    const result = await getAuthStatusByUserId('999');
    expect(result).toBeNull();
  });

  test('getAuthStatusByUserId throws error when both RPC and REST fail', async () => {
    // RPC call fails
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('RPC error'); },
      text: async () => 'Internal Server Error',
    });
    // REST fallback also fails
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
      json: async () => [],
    });

    await expect(getAuthStatusByUserId('123')).rejects.toThrow('Supabase GET 500');
  });

  test('getAuthStatusByUserId uses env variables for URL and key', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, user_id: 123, status: true }),
      text: async () => '',
      status: 200,
    });

    await getAuthStatusByUserId('123');
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain('test.supabase.co');
    const calledOptions = global.fetch.mock.calls[0][1];
    expect(calledOptions.headers.apikey).toBe('test-key');
  });
});