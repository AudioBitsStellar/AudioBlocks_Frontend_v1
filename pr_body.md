- closes #486
- closes #489
- closes #492
- closes #493

### Explanation of Changes

1. **Dark/Light Theme for Auth Modal (Issue #486):** 
   Configured the `DynamicContextProvider` (which replaces Privy for authentication) to automatically inherit the system/app theme by setting `theme: 'auto'` in its settings.

2. **Rate Limit Handling UI (Issue #489):**
   Added rate-limit handling in `hooks/useAuth.tsx`. When the backend returns a `429 Too Many Requests` status during `authenticateUser`, it intercepts the error and surfaces a user-friendly `toast.error` rather than a generic authentication failure.

3. **Mobile-Responsive Login Modal (Issue #492):**
   Injected `cssOverrides` into the Dynamic context settings to ensure the `.dynamic-shadow-dom` scales correctly to 100% width on smaller viewports with appropriate margins and a maximum width constraint.

4. **Accessibility Support for Login Modal (Issue #493):**
   Added custom focus indicators via `cssOverrides` for interactive elements (`button`, `input`) within the auth modal to meet WCAG standards for keyboard navigation and screen readers.
