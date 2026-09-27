// #411 — async job queue for quality analysis.
//
// Enqueues an upload for the AI Song Quality Filter pipeline
// (lib/uploadQualityPipeline.ts) and returns immediately with a job id
// instead of blocking the request for however long the NVIDIA assessment
// takes. Poll GET /api/quality-analysis/[jobId] for the result.
import { NextRequest, NextResponse } from 'next/server';
import { qualityAnalysisJobQueue } from '@/lib/qualityAnalysisJobQueue';
import type { UploadQualityPipelineInput } from '@/lib/uploadQualityPipeline';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== 'object' || typeof body.trackId !== 'string' || !body.trackId) {
    return NextResponse.json({ error: 'trackId is required' }, { status: 400 });
  }
  if (typeof body.title !== 'string' || !body.title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const input: UploadQualityPipelineInput = {
    trackId: body.trackId,
    title: body.title,
    artist: body.artist,
    genre: body.genre,
    durationSeconds: body.durationSeconds,
    lyrics: body.lyrics,
    audioBuffer: body.audioBuffer,
    audioHash: body.audioHash,
    spectralFeatures: body.spectralFeatures,
    stems: body.stems,
    subject: body.subject,
    integratedLufs: body.integratedLufs,
    truePeakDbtp: body.truePeakDbtp,
  };

  const jobId = qualityAnalysisJobQueue.enqueue(input);

  return NextResponse.json({ jobId, status: 'queued' }, { status: 202 });
}
