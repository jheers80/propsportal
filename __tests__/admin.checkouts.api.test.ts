// Mock next/server (Next expects Web Request globals)
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (payload: any, opts?: any) => ({ ...payload, status: opts?.status })
  }
}));

// Mock createAdminSupabase to provide a fake supabaseAdmin
jest.mock('../src/lib/createAdminSupabase', () => ({
  createAdminSupabase: jest.fn()
}));

const createAdminSupabaseModule = require('../src/lib/createAdminSupabase');

// Require the route after mocks
const route = require('../src/app/api/admin/checkouts/route');

function makeRequest(body: any, token = 'fake-token') {
  return {
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'authorization') return `Bearer ${token}`;
        return null;
      }
    },
    json: async () => body,
    url: 'http://localhost/api/admin/checkouts'
  } as any;
}

describe('Admin checkouts API', () => {
  beforeEach(() => jest.resetAllMocks());

  test('GET returns enriched checkouts for superadmin', async () => {
    const mockUser = { id: 'admin-1' };
    const supabaseAdmin = {
      auth: { getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: mockUser.id, role: 'r1' }, error: null }) }) }) };
        }
        if (table === 'user_roles') {
          return { select: () => ({ eq: () => ({ limit: () => ({ single: async () => ({ data: { id: 'r1', name: 'superadmin' }, error: null }) }) }) }) };
        }
        if (table === 'task_list_checkouts') {
          return {
            select: () => ({
              range: async (s: number, e: number) => ({
                data: [
                  {
                    task_list_id: 'tl1',
                    user_id: 'user-1',
                    checked_out_at: '2025-10-03T12:00:00Z',
                    task_list: { name: 'Morning Tasks' },
                    user: { id: 'user-1', full_name: 'Alice', email: 'alice@example.com' }
                  }
                ],
                error: null,
                count: 1
              })
            })
          };
        }
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      })
    };

  (createAdminSupabaseModule.createAdminSupabase as jest.Mock).mockReturnValue(supabaseAdmin);

    const req = makeRequest(null);
    const res = await route.GET(req);
    expect(res).toBeDefined();
    expect(res.checkouts).toBeDefined();
    expect(Array.isArray(res.checkouts)).toBe(true);
    expect(res.checkouts[0].task_list_name).toBe('Morning Tasks');
    expect(res.meta).toBeDefined();
    expect(res.meta.total).toBe(1);
  });

  test('POST force-release deletes checkout and writes audit', async () => {
    const mockUser = { id: 'admin-1' };
    const supabaseAdmin = {
      auth: { getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: mockUser.id, role: 'r1' }, error: null }) }) }) };
        if (table === 'user_roles') return { select: () => ({ eq: () => ({ limit: () => ({ single: async () => ({ data: { id: 'r1', name: 'superadmin' }, error: null }) }) }) }) };
        if (table === 'task_list_checkouts') return { delete: () => ({ eq: async () => ({ error: null }) }) };
        if (table === 'task_list_checkout_audit') return { insert: async (payload: any) => ({ error: null }) };
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      })
    };

  (createAdminSupabaseModule.createAdminSupabase as jest.Mock).mockReturnValue(supabaseAdmin);

    const req = makeRequest({ task_list_id: 'tl1' });
    const res = await route.POST(req);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  test('POST forbidden for non-superadmin', async () => {
    const mockUser = { id: 'user-2' };
    const supabaseAdmin = {
      auth: { getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: mockUser.id, role: 'r2' }, error: null }) }) }) };
        if (table === 'user_roles') return { select: () => ({ eq: () => ({ limit: () => ({ single: async () => ({ data: { id: 'r2', name: 'staff' }, error: null }) }) }) }) };
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      })
    };

  (createAdminSupabaseModule.createAdminSupabase as jest.Mock).mockReturnValue(supabaseAdmin);

    const req = makeRequest({ task_list_id: 'tl1' });
    const res = await route.POST(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(403);
  });
});
