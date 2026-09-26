/**
 * Quality check skip option for admin-approved artists (#447).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA): admins can grant
 * trusted artists a standing exemption from the automated quality check, and
 * admins themselves bypass it outright. Everyone else — listeners and
 * unapproved artists — must go through the check.
 *
 * This helper is the single source of truth for the UI gate. Enforcement
 * stays server-side; a crafted client request must never skip the check on
 * its own.
 */

/** Roles that bypass the quality check outright. */
export const QUALITY_CHECK_EXEMPT_ROLES = ['admin'] as const;

/** The role an artist account holds (see `lib/authRoles.ts`). */
export const ARTIST_ROLE = 'artist';

export interface QualityCheckSubject {
  role: string;
  /** True once an admin has approved this artist for skip eligibility. */
  qualityCheckApproved?: boolean;
}

/**
 * Returns true when the subject may skip the automated quality check —
 * either an exempt role (admin) or an admin-approved artist.
 */
export function canSkipQualityCheck(subject?: QualityCheckSubject | null): boolean {
  if (!subject || typeof subject.role !== 'string') return false;

  if (QUALITY_CHECK_EXEMPT_ROLES.includes(subject.role as (typeof QUALITY_CHECK_EXEMPT_ROLES)[number])) {
    return true;
  }

  return subject.role === ARTIST_ROLE && subject.qualityCheckApproved === true;
}

/**
 * Returns true when the subject must pass through the automated quality
 * check before their track is published.
 */
export function isQualityCheckRequired(subject?: QualityCheckSubject | null): boolean {
  return !canSkipQualityCheck(subject);
}
