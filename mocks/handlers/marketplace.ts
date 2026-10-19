import { http, HttpResponse } from 'msw';
import {
  mockPreparedTransactionFixture,
  mockSubmittedTransactionFixture,
} from '../fixtures/marketplace';
import { errorResponse } from './response';

/** The prepare/submit pairs in AudioBlock_Backend `src/routes/marketplaceRoutes.ts`. */
const ACTIONS = ['listing', 'buy', 'auction', 'bid'] as const;

/** Soroban relay: the backend builds the transaction, the wallet signs, the backend submits. */
export const marketplaceHandlers = ACTIONS.flatMap((action) => [
  http.post(`*/api/marketplace/prepare-${action}`, () =>
    HttpResponse.json({ success: true, data: mockPreparedTransactionFixture })
  ),

  // `SubmitSignedXdrDTO`: `signedXdr` must be a non-empty string.
  http.post(`*/api/marketplace/submit-${action}`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { signedXdr?: unknown };
    if (typeof body.signedXdr !== 'string' || !body.signedXdr) {
      return errorResponse(400, 'signedXdr is required.', 'VALIDATION_FAILED');
    }
    return HttpResponse.json({ success: true, data: mockSubmittedTransactionFixture });
  }),
]);
