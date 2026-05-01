import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { getVersionReport } from '@/lib/versions';

export const GET = withAuth(async () => {
  return NextResponse.json({ report: await getVersionReport() });
});
