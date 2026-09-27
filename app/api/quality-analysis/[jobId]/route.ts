// #411 — poll the status/result of a job enqueued via POST /api/quality-analysis.
import { NextRequest, NextResponse } from 'next/server';
import { qualityAnalysisJobQueue } from '@/lib/qualityAnalysisJobQueue';

export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const job = qualityAnalysisJobQueue.getJob(params.jobId);

  if (!job) {
    return NextResponse.json({ error: 'job not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}
