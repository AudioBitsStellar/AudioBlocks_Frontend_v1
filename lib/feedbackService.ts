import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';

/** Matches the backend feedback message length limit. */
export const FEEDBACK_MESSAGE_MAX_LENGTH = 1000;

/**
 * Submits in-app feedback (#857). `email` lets a signed-out visitor provide a
 * way to be reached back; signed-in requests are attributed server-side from
 * the auth cookie and don't need it.
 */
export async function submitFeedback(message: string, email?: string): Promise<void> {
  const trimmedMessage = message.trim();
  const trimmedEmail = email?.trim();

  await apiClient.post(API_ENDPOINTS.SUPPORT_FEEDBACK, {
    message: trimmedMessage,
    ...(trimmedEmail ? { email: trimmedEmail } : {}),
  });
}
