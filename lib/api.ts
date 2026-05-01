import { NextResponse } from 'next/server';
import { requireAuth } from './session';

export function jsonError(error: unknown, status = 500) {
  if (error instanceof Response) {
    return NextResponse.json({ error: error.statusText || 'Unauthorized' }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return NextResponse.json({ error: message }, { status });
}

export function withAuth<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try {
      requireAuth();
      return await handler(...args);
    } catch (error) {
      return jsonError(error, error instanceof Response ? error.status : 500);
    }
  };
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('Invalid JSON body');
  }
}
