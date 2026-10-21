import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';

/** Matches the backend `ReportCommentDTO` description limit. */
export const REPORT_DETAILS_MAX_LENGTH = 1000;

/** HTTP status the API returns when the signed-in user has already reported this content. */
export const DUPLICATE_REPORT_STATUS = 409;

export interface ReportReasonOption {
  value: string;
  label: string;
}

/** Reasons accepted by `ReportSongDTO` (backend `ReportReason`). */
export const SONG_REPORT_REASONS: readonly ReportReasonOption[] = [
  { value: 'copyright', label: 'Copyright infringement' },
  { value: 'explicit', label: 'Explicit content' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Something else' },
];

/** Reasons accepted by `ReportCommentDTO` (backend `CommentReportReason`). */
export const COMMENT_REPORT_REASONS: readonly ReportReasonOption[] = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'other', label: 'Something else' },
];

export type ReportTarget =
  | { kind: 'song'; id: string | number }
  | { kind: 'comment'; id: string | number };

/**
 * Files a report against a song or comment. Requires an authenticated session.
 *
 * @param target - The content being reported.
 * @param reason - One of the reason values for that target kind.
 * @param description - Optional free-text details, trimmed before sending.
 * @throws ApiError with status 409 when the user has already reported this content.
 */
export async function submitReport(
  target: ReportTarget,
  reason: string,
  description?: string
): Promise<void> {
  const endpoint =
    target.kind === 'song'
      ? API_ENDPOINTS.SONG_REPORT(target.id)
      : API_ENDPOINTS.COMMENT_REPORT(target.id);
  const trimmed = description?.trim();

  await apiClient.post(endpoint, {
    reason,
    ...(trimmed ? { description: trimmed } : {}),
  });
}
