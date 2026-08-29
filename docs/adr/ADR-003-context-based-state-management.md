# ADR-003: Use React Context for Global State Management

## Status

Accepted

## Context

AudioBlocks requires shared state for wallet connection, audio playback, theme, and user preferences. The team wanted to avoid the complexity of Redux or Zustan until the state surface justifies it.

## Decision

Use React Context API combined with `useReducer` for global state management.

## Consequences

### Positive

- No additional dependencies beyond React.
- Sufficient for current global state needs.
- Easy to understand for contributors familiar with React.
- Providers can be composed in `app/layout.tsx`.

### Negative

- Context re-renders can become a performance bottleneck as state grows.
- Deep component trees may require prop drilling or multiple contexts.

## Migration Path

If global state complexity increases significantly, evaluate migrating to Zustand or Redux Toolkit. The current provider structure should make this migration straightforward.

## References

- `context/AudioContext.tsx`
- `context/ThemeContext.tsx`
- `context/UserContext.tsx`
