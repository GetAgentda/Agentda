'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWorkspace = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create workspace');
      }

      const { workspaceId } = await response.json();
      router.push(`/workspace/${workspaceId}`);
    } catch (err) {
      setError('Failed to create workspace. Please try again.');
      console.error('Error creating workspace:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-2xl text-center">
        <h1 className="mb-8 text-4xl font-bold tracking-tight text-gray-900">
          Welcome to Agentda
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          Create an instant meeting workspace - no login required.
          Your workspace will be available for 15 days.
        </p>
        <button
          onClick={createWorkspace}
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Workspace'}
        </button>
        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
