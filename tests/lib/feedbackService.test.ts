import { describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/apiClient';
import { submitFeedback } from '@/lib/feedbackService';

vi.mock('@/lib/apiClient', () => ({
  default: { post: vi.fn().mockResolvedValue({}) },
}));

const mockPost = vi.mocked(apiClient.post);

describe('submitFeedback (#857)', () => {
  it('sends a trimmed message without an email by default', async () => {
    await submitFeedback('  Great app!  ');
    expect(mockPost).toHaveBeenCalledWith('/api/support/feedback', { message: 'Great app!' });
  });

  it('includes a trimmed email when provided', async () => {
    await submitFeedback('Found a bug', '  me@example.com  ');
    expect(mockPost).toHaveBeenCalledWith('/api/support/feedback', {
      message: 'Found a bug',
      email: 'me@example.com',
    });
  });

  it('omits a blank email', async () => {
    await submitFeedback('Found a bug', '   ');
    expect(mockPost).toHaveBeenCalledWith('/api/support/feedback', { message: 'Found a bug' });
  });
});
