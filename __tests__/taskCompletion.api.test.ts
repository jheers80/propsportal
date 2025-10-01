// We must mock next/server before loading the route module because Next's server
// code assumes Web Request globals that aren't present in Jest's Node runtime.
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

// Mock recurrence engine
jest.mock('../src/services/recurrenceEngine', () => ({
  generateNextInstance: jest.fn()
}));

const { createAdminSupabase } = require('../src/lib/createAdminSupabase');
const { generateNextInstance } = require('../src/services/recurrenceEngine');

// Now require the route handler after mocking next/server
const { POST } = require('../src/app/api/task-instances/complete/route');

// Helper to build a fake NextRequest-like object with headers and json()
function makeRequest(body: any, token = 'fake-token') {
  return {
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'authorization') return `Bearer ${token}`;
        return null;
      }
    },
    json: async () => body
  } as any;
}

describe('POST /api/task-instances/complete', () => {
  beforeEach(() => jest.resetAllMocks());

  test('completing an instance inserts completion and next instance when recurring', async () => {
    // Arrange
    const mockUser = { id: 'user-1' };
    const mockProfile = { id: 'user-1', role: 'staff' };
    const mockTask = { id: 'task1', is_recurring: true, repeat_from_completion: true, task_list_id: 'tl1' };
    const mockInstance = { id: 'inst1', tasks: mockTask };

    // build fake supabaseAdmin with chained query helpers
    const inserted: any[] = [];
    const supabaseAdmin = {
      auth: { getUser: jest.fn(async (token: string) => ({ data: { user: mockUser }, error: null })) },
      rpc: jest.fn(async () => ({ error: null })),
      from: jest.fn((table: string) => {
        if (table === 'task_instances') {
          return {
            select: () => ({ eq: (col: string, val: any) => ({ single: async () => ({ data: mockInstance, error: null }) }) }),
            update: () => ({ eq: async () => ({ error: null }) }),
            insert: async (payload: any) => { inserted.push({ table: 'task_instances', payload }); return { error: null }; }
          };
        }
        if (table === 'task_completions') {
          return { insert: async (payload: any) => ({ error: null }) };
        }
        if (table === 'task_lists') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'tl1', role_id: 'staff', location_id: null }, error: null }) }) }) };
        }
        if (table === 'profiles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: mockProfile, error: null }) }) }) };
        }
        if (table === 'user_roles') {
          return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
        }
        if (table === 'user_locations') {
          return { select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) };
        }
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      })
    };

  (createAdminSupabase as jest.Mock).mockReturnValue(supabaseAdmin);
    const nextDue = new Date('2025-10-02T00:00:00.000Z');
    (generateNextInstance as jest.Mock).mockReturnValue({ task_id: 'task1', due_date: nextDue, status: 'pending' });

    const req = makeRequest({ instance_id: 'inst1' });

    // Act
    const res = await POST(req);

    // Assert: RPC should be called and payload should include completion + next_instance
    expect(res).toBeDefined();
    expect((supabaseAdmin.rpc as any).mock.calls.length).toBeGreaterThanOrEqual(1);
    const rpcCall = (supabaseAdmin.rpc as any).mock.calls[0];
    expect(rpcCall[0]).toBe('complete_task_and_insert_next');
    const payload = rpcCall[1];
    expect(payload).toBeDefined();
    expect(payload.completion).toBeDefined();
    expect(payload.completion.task_instance_id).toBe('inst1');
    expect(payload.next_instance).toBeDefined();
    expect(new Date(payload.next_instance.due_date).toISOString()).toBe(nextDue.toISOString());
  });

  test('non-recurring task does not insert next instance', async () => {
    const mockUser = { id: 'user-2' };
    const mockProfile = { id: 'user-2', role: 'staff' };
    const mockTask = { id: 'task2', is_recurring: false, repeat_from_completion: false, task_list_id: 'tl1' };
    const mockInstance = { id: 'inst2', tasks: mockTask };

    const inserted: any[] = [];
    const supabaseAdmin = {
      auth: { getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })) },
      rpc: jest.fn(async () => ({ error: null })),
      from: jest.fn((table: string) => {
        if (table === 'task_instances') {
          return {
            select: () => ({ eq: () => ({ single: async () => ({ data: mockInstance, error: null }) }) }),
            update: () => ({ eq: async () => ({ error: null }) }),
            insert: async (payload: any) => { inserted.push({ table: 'task_instances', payload }); return { error: null }; }
          };
        }
        if (table === 'task_completions') return { insert: async () => ({ error: null }) };
        if (table === 'task_lists') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'tl1', role_id: 'staff' }, error: null }) }) }) };
        if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: mockProfile, error: null }) }) }) };
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      })
    };

  (createAdminSupabase as jest.Mock).mockReturnValue(supabaseAdmin);
  (generateNextInstance as jest.Mock).mockReturnValue(null);

    const req = makeRequest({ instance_id: 'inst2' });
  const res = await POST(req);
  expect(res).toBeDefined();
  // RPC should be called with next_instance null
  expect((supabaseAdmin.rpc as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  const rpcCall = (supabaseAdmin.rpc as any).mock.calls[0];
  expect(rpcCall[0]).toBe('complete_task_and_insert_next');
  expect(rpcCall[1].next_instance).toBeNull();
  });

  test('recurrence engine failure does not break completion', async () => {
    const mockUser = { id: 'user-3' };
    const mockProfile = { id: 'user-3', role: 'staff' };
    const mockTask = { id: 'task3', is_recurring: true, repeat_from_completion: true, task_list_id: 'tl1' };
    const mockInstance = { id: 'inst3', tasks: mockTask };

    const inserted: any[] = [];
    const supabaseAdmin = {
      auth: { getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })) },
      rpc: jest.fn(async () => ({ error: null })),
      from: jest.fn((table: string) => {
        if (table === 'task_instances') {
          return {
            select: () => ({ eq: () => ({ single: async () => ({ data: mockInstance, error: null }) }) }),
            update: () => ({ eq: async () => ({ error: null }) }),
            insert: async (payload: any) => { inserted.push({ table: 'task_instances', payload }); return { error: null }; }
          };
        }
        if (table === 'task_completions') return { insert: async () => ({ error: null }) };
        if (table === 'task_lists') return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'tl1', role_id: 'staff' }, error: null }) }) }) };
        if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: mockProfile, error: null }) }) }) };
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      })
    };

  (createAdminSupabase as jest.Mock).mockReturnValue(supabaseAdmin);
  (generateNextInstance as jest.Mock).mockImplementation(() => { throw new Error('boom'); });

    const req = makeRequest({ instance_id: 'inst3' });
  const res = await POST(req);
  expect(res).toBeDefined();
  // RPC should be called but with next_instance null since generation failed
  expect((supabaseAdmin.rpc as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  const rpcCall = (supabaseAdmin.rpc as any).mock.calls[0];
  expect(rpcCall[0]).toBe('complete_task_and_insert_next');
  expect(rpcCall[1].next_instance).toBeNull();
  });
});
