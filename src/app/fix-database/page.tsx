'use client';

import { useState } from 'react';

export default function FixDatabase() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{
    sql_commands?: Array<{
      title: string;
      sql: string;
    }>;
  } | null>(null);
  const [error, setError] = useState<string>('');

  const handleFixDatabase = async () => {
    setStatus('loading');
    setError('');

    try {
      try {
        const { apiPost } = await import('@/lib/apiPost');
        const data = await apiPost<{
          sql_commands?: Array<{
            title: string;
            sql: string;
          }>;
        }>('/api/fix-db');
        setStatus('success');
        setResult(data);
      } catch (err: any) {
        setStatus('error');
        setError(err?.message || 'Unknown error occurred');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Network error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Database RLS Policy Fix
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            This tool helps fix the infinite recursion issue in your database Row Level Security policies.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Problem Description</h2>
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">
                <strong>Infinite Recursion Error:</strong> The current RLS policies are causing infinite recursion
                because the <code>get_my_role()</code> function queries the profiles table, but the profiles table
                policies also call <code>get_my_role()</code>.
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Solution</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Update the <code>get_my_role()</code> function to use <code>SECURITY DEFINER</code></li>
              <li>Simplify RLS policies to use the function directly instead of complex EXISTS queries</li>
              <li>Remove circular dependencies between policies and functions</li>
            </ol>
          </div>

          <div className="mb-6">
            <button
              onClick={handleFixDatabase}
              disabled={status === 'loading'}
              className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                status === 'loading'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
            >
              {status === 'loading' ? 'Testing Database Connection...' : 'Test Database & Get SQL Commands'}
            </button>
          </div>

          {status === 'success' && result && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                <div className="text-green-800">
                  <strong>✓ Database Connection Successful!</strong>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-2">SQL Commands to Run</h3>
                <p className="text-blue-800 mb-4">
                  Copy and paste these SQL commands into your Supabase SQL Editor:
                </p>

                {result.sql_commands?.map((command: { title: string; sql: string }, index: number) => (
                  <div key={index} className="mb-4">
                    <h4 className="font-medium text-blue-900 mb-2">{command.title}</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                      {command.sql.trim()}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-gray-500">
          <p>After applying the SQL commands, refresh your application to test the fixes.</p>
        </div>
      </div>
    </div>
  );
}
