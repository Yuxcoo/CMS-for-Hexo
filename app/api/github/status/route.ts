import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { dispatchWorkflow, listRecentCommits, listWorkflowRuns, listWorkflows, resolvePublishWorkflow } from '@/lib/github';

export const GET = withAuth(async () => {
  const [commits, runs, workflows] = await Promise.all([listRecentCommits(), listWorkflowRuns().catch(() => []), listWorkflows().catch(() => [])]);
  const publishWorkflow = await resolvePublishWorkflow().catch(() => null);
  return NextResponse.json({ commits, runs, workflows, publishWorkflow });
});

export const POST = withAuth(async () => {
  const workflow = await dispatchWorkflow();
  return NextResponse.json({ ok: true, workflow });
});
