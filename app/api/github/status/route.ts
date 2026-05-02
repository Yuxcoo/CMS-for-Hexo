import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { dispatchWorkflow, listRecentCommits, listWorkflowRuns, listWorkflows, resolvePublishWorkflow } from '@/lib/github';

export const GET = withAuth(async () => {
  const publishWorkflow = await resolvePublishWorkflow().catch(() => null);
  const [commits, runs, workflows] = await Promise.all([
    listRecentCommits(),
    publishWorkflow ? listWorkflowRuns(publishWorkflow).catch(() => []) : Promise.resolve([]),
    listWorkflows().catch(() => [])
  ]);
  return NextResponse.json({ commits, runs, workflows, publishWorkflow });
});

export const POST = withAuth(async () => {
  const workflow = await dispatchWorkflow();
  return NextResponse.json({ ok: true, workflow });
});
