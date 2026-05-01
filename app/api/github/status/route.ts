import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { dispatchWorkflow, listRecentCommits, listWorkflowRuns } from '@/lib/github';

export const GET = withAuth(async () => {
  const [commits, runs] = await Promise.all([listRecentCommits(), listWorkflowRuns().catch(() => [])]);
  return NextResponse.json({ commits, runs });
});

export const POST = withAuth(async () => {
  await dispatchWorkflow();
  return NextResponse.json({ ok: true });
});
