# Route session security

Protected Next.js routes authorize only with the `audioblocks_session` HttpOnly cookie.

The browser-readable access token is still retained temporarily because the listener frontend calls the separate AudioBlocks API origin with an `Authorization: Bearer` header. It is **not** accepted by middleware as proof that a user may enter a protected route.

Before `POST /api/session` writes the HttpOnly cookie, the Next.js server presents the access token to the backend's authenticated profile endpoint. A backend 401/403 is rejected and an unavailable verifier fails closed. Raw Privy cookies are likewise not treated as route authorization evidence.

This keeps JWT signing keys out of the frontend while making the token issuer the authority for session establishment. Token refresh must successfully re-establish the verified HttpOnly session before the refreshed token is accepted.
