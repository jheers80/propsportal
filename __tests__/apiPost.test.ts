import { apiPost, apiGet, apiPut, apiDelete } from '../src/lib/apiPost';

// Mock getSessionToken to avoid side effects
jest.mock('../src/lib/supabaseClient', () => ({
  getSessionToken: jest.fn(async () => 'fake-token'),
}));

describe('apiPost/apiGet/apiPut/apiDelete', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  test('apiPost returns parsed JSON when response ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, value: 42 }),
    });

    const res = await apiPost('/api/test', { a: 1 });
    expect(res).toEqual({ success: true, value: 42 });
    expect(global.fetch).toHaveBeenCalled();
  });

  test('apiGet returns parsed JSON when response ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [1, 2, 3] }),
    });

    const res = await apiGet('/api/test-get');
    expect(res).toEqual({ items: [1, 2, 3] });
  });

  test('apiPost handles non-JSON response gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new Error('invalid json'); },
    });

    const res = await apiPost('/api/text');
    expect(res).toBeNull();
  });

  test('apiPost throws Error with message from JSON when not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad things' }),
    });

    await expect(apiPost('/api/bad')).rejects.toThrow('Bad things');
  });

  test('apiDelete with body returns parsed JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ deleted: true }),
    });

    const res = await apiDelete('/api/delete', { id: 1 });
    expect(res).toEqual({ deleted: true });
  });
});
