# Crossfade Feature Documentation

AudioBlocks Frontend provides an advanced audio crossfade feature (`#115`) that enables seamless, overlap transitions between consecutive tracks in the player.

---

## 🎧 Overview & Architecture

The crossfade mechanism eliminates silence between tracks by overlapping the end of the currently playing track with the start of the next track. The volume of the outgoing track ramps down exponentially/linearly while the incoming track volume ramps up over a configurable overlap period (0 to 5 seconds).

```
        Outgoing Track Volume
      1.0 ──────┐
                │ \  (Fade Out)
                │   \
      0.0 ──────┴────\──────────► Time (Seconds)
                      \
                      / \
                     /   \ (Fade In)
      0.0 ──────────/─────\─────► Time (Seconds)
        Incoming Track Volume
              ◄── Overlap Duration (0s–5s) ──►
```

---

## ⚙️ Core Configuration & State Management

Crossfade settings are managed globally via `context/PlaybackContext.tsx` and consumed by player components (`components/common/Player.tsx` and `FullScreenPlayer.tsx`).

### State Properties (`PlaybackState`)

- **`crossfadeDuration`** (`number`): The duration of overlap in seconds (clamped between `0` and `5`). Setting `0` disables crossfading (hard cut transition).
- **`isCrossfading`** (`boolean`): Active flag set to `true` while two audio instances are overlapping during a track change.

### Context Methods (`PlaybackContextValue`)

```typescript
/** Set crossfade duration in seconds (clamped between 0 and 5). 0 disables. */
setCrossfadeDuration(duration: number): void;

/** Internal flag toggle when crossfade transition begins/ends. */
setCrossfading(isCrossfading: boolean): void;
```

### Safety Helper Function

```typescript
/** Clamp crossfade duration to the supported 0–5 second range. */
export function clampCrossfadeDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.min(5, Math.max(0, seconds));
}
```

---

## 🔀 Implementation Mechanics in `Player.tsx`

### Dual Audio Instances / Nodes

When crossfade is enabled (`crossfadeDuration > 0`):

1. **Primary Audio Element**: Plays the active track until remaining time equals `crossfadeDuration`.
2. **Secondary / Secondary Buffer Audio Element**: When remaining time reaches `crossfadeDuration`, the secondary audio element initializes playback of the upcoming track in the queue or playlist.
3. **Gain Control Loop**: A `requestAnimationFrame` gain control loop progressively lowers the outgoing element volume while raising the incoming element volume.
4. **Handoff**: Once the fade out finishes, the outgoing audio element is paused and reset, and the secondary audio element becomes the primary active player.

---

## 🔄 Interaction with Other Playback Features

- **Manual Track Skipping (`Next` / `Prev`)**:
  - When the listener manually clicks Next or Prev, a quick sub-second (0.5s) micro-crossfade or direct swap executes to ensure immediate user responsiveness.
- **Gapless Playback (`#329`)**:
  - Works in tandem with gapless preloading. Incoming tracks are pre-buffered into memory so crossfading begins without network buffering stalls.
- **Loudness Normalization (`#328`)**:
  - Dynamic gain adjustments are calculated prior to crossfading so both tracks overlap at consistent perceived loudness.
- **Media Session Sync**:
  - `useMediaSession` hook metadata updates immediately when the crossfade transition reaches the mid-point (50% crossfade threshold).

---

## 🛠 Troubleshooting & Edge Cases

1. **Very Short Tracks (< 10 seconds)**:
   - If a track's total duration is shorter than twice the `crossfadeDuration`, the system dynamically scales `crossfadeDuration` to 25% of the total track length to prevent premature cutoffs.
2. **Browser Autoplay Restrictions**:
   - Web Audio gain nodes and secondary HTML5 Audio playback must be triggered within user interaction context or after initial play permission is established (`autoplayBlocked` state handler).
3. **Muted / Zero Volume State**:
   - If `isMuted` is true, volume gain ramping executes silently in the background without affecting audio hardware states.
