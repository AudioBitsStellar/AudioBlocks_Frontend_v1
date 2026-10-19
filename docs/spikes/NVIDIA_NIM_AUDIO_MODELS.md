# Spike: NVIDIA NIM audio / quality models (#401)

**Initiative:** AI Song Quality Filter (Mastra AI + NVIDIA)
**Question:** Which NVIDIA NIM models can assess the audio quality of an uploaded song (clipping, noise, loudness, fidelity), and how should the filter use them?
**Status:** Research complete. Sources were checked in September 2026 (see [Sources](#sources)); re-verify the catalog before implementation, because it changes often.

---

## TL;DR

1. **There is no NIM that scores music or song audio quality.** NVIDIA's audio NIMs are speech-focused: transcription (ASR), speech synthesis (TTS), and speech enhancement (Maxine BNR / Studio Voice / Audio Super-Resolution). They process audio; none of them outputs a quality score for music.
2. **The music-capable NVIDIA models, Audio Flamingo 3 and Music Flamingo, can't be used in production.** Both are released under the **NVIDIA OneWay Noncommercial License** (non-commercial research only), and neither is offered as a NIM or hosted API.
3. **The current filter doesn't listen to the audio at all.** `lib/songQualityFilter.ts` sends only **metadata** (title, genre, duration) to `nvidia/llama-3.1-nemotron-70b-instruct`, a **text-only** LLM. Any "quality" score it returns is inferred from the song's title and genre, not from the recording.
4. **Recommendation:** a **hybrid pipeline**. Compute objective audio metrics deterministically (loudness, true peak, clipping, noise floor, spectral cutoff, and so on) in the preprocessing step (#406), then pass **those numbers** to the already-pinned Nemotron text NIM (#404/#407). The model applies the scoring criteria (#405) and writes the artist-facing explanation (#414). The model reasons over measurements instead of guessing.

---

## 1. What the NIM catalog offers for audio

| Model family (NIM) | What it does | Input → output | Useful for song quality? |
|---|---|---|---|
| **Speech ASR NIM**: Parakeet (CTC / TDT v2–v3 / RNNT), Canary 1B, Whisper Large v3, Nemotron ASR Streaming, Conformer CTC | Speech-to-text | audio → transcript | **No** for quality. *Possibly* for a separate lyrics / explicit-content feature. |
| **Speech TTS NIM** (e.g. Magpie TTS) | Text-to-speech | text → audio | **No** |
| **Maxine BNR** (Background Noise Removal) | Removes background noise from **speech** (streaming or transactional) | audio → cleaned audio | **No.** It's a processor, not a scorer, and it's tuned for speech. Running it on music would damage the mix. |
| **Maxine Studio Voice** | Restores degraded **speech** recordings to a "studio" sound | audio → enhanced audio | **No**, for the same reason: speech enhancement, not assessment |
| **Maxine Audio Super-Resolution** | Predicts high-frequency content for low-bandwidth audio | audio → upsampled audio | **No.** It could hide a low-quality upload instead of flagging it. |
| **LLM NIMs** (e.g. `nvidia/llama-3.1-nemotron-70b-instruct`, already pinned in `config/mastra.ts`) | Text reasoning and generation | text → text | **Yes, as the reasoning layer**, when given measured audio features as text. It can't read audio. |

The ASR models are deployed as self-hosted containers (NeMo models on TensorRT/Triton). Hosted endpoints on build.nvidia.com exist for evaluation. Check production licensing (NVIDIA AI Enterprise) before committing to any self-hosted NIM.

## 2. Music-understanding models (not NIMs)

| Model | Capability | Constraints |
|---|---|---|
| **Audio Flamingo 3** (7B, Qwen2.5-7B backbone + AF-Whisper encoder) | Audio-language model: reasoning and Q&A over speech, sound and **music**, up to ~10 min per sample (30 s windows) | **NVIDIA OneWay Noncommercial License**, plus Qwen Research License and OpenAI terms for parts. **No commercial use.** Not a NIM; self-host on A100/H100-class GPUs. |
| **Music Flamingo** (~8B, built on AF3) | Music-specific captioning and Q&A (harmony, structure, timbre, lyrics) | Same **non-commercial** license, not a NIM, same GPU class. The model card makes **no claims about recording-quality assessment** (clipping, noise, mastering). |

**Verdict:** these are the only NVIDIA models that genuinely "hear" music, but AudioBlocks is a commercial product, so they're **off the table without a separate commercial agreement with NVIDIA**. They could serve as an **offline research benchmark** (e.g. to sanity-check the hybrid scorer on a labelled set) only if the team's use qualifies as non-commercial research. Confirm with legal first.

## 3. Gap in the current implementation

- `docs/NVIDIA_API_SETUP.md` said the agent "sends the audio to the NVIDIA NIM inference endpoint". That's inaccurate, and it's corrected in this PR.
- `docs/AI_SONG_QUALITY_FILTER.md` correctly states that "Raw audio is never uploaded; only song metadata is sent."
- So the verdict (`approved` / `review` / `rejected`) comes from a text model looking at `{ title, genre, durationSeconds }`. It **can't detect clipping, noise, low bitrate or bad loudness**, which are exactly the criteria in #405 and the ones shown to artists in #414. A clipped, 96 kbps upload named "Midnight Drive" scores the same as a clean master with the same metadata.

## 4. Recommended architecture

```
upload ──► preprocessing (#406) ──► feature vector ──► Nemotron NIM via Mastra tool (#404/#407) ──► assessment
            deterministic DSP          (numbers, JSON)      scoring + explanation                        (#408 aggregate)
```

**Step 1: measure (deterministic, no AI).** Compute these server-side on the decoded audio:

| Feature | Maps to #405 criterion | Standard / how |
|---|---|---|
| Integrated loudness (LUFS), loudness range (LU) | loudness | ITU-R BS.1770 / EBU R128 |
| True peak (dBTP) | clipping / loudness | BS.1770 true-peak (oversampled) |
| Clipped-sample ratio, consecutive full-scale runs | clipping | count samples at or near ±1.0 FS |
| Noise floor / SNR estimate (quietest-window RMS) | noise | windowed RMS |
| Sample rate, bit depth, codec, bitrate | bitrate | container / stream metadata |
| Spectral cutoff frequency | bitrate (catches **upsampled/transcoded** low-bitrate files) | FFT energy roll-off (e.g. a hard cut at ~16 kHz suggests an MP3 ≤128 kbps source) |
| Leading/trailing silence, DC offset, mono/phase issues | general | simple statistics |

Candidate tooling: `ffmpeg` filters (`ebur128`, `astats`), or `libebur128` for loudness. **Check the licenses** before choosing: ffmpeg is LGPL or GPL depending on the build, and some audio-analysis libraries are copyleft (AGPL/GPL). These run in the backend or worker, never in this frontend.

**Step 2: reason (NIM).** Send the feature vector, not the metadata, to the pinned Nemotron NIM with the #405 thresholds in the prompt. Ask it for:
- `verdict` + `score`, constrained to the existing `SongQualityAssessment` contract;
- `reasons[]` in artist-friendly language, e.g. "True peak +0.8 dBTP: the master clips; reduce the limiter ceiling to −1 dBTP."

Keep the **hard thresholds deterministic** (e.g. true peak > 0 dBTP ⇒ at least `review`) so the LLM can't approve a clipped file, and use the LLM for aggregation of borderline cases and for explanation. That also makes #408/#428 unit-testable without the network.

**Step 3 (optional, separate feature):** an ASR NIM (Parakeet/Canary) could transcribe vocals for lyric search or explicit-content flags. That isn't a quality signal, so keep it out of the pass/fail path.

## 5. Impact on the initiative's issues

| Issue | Change suggested by this spike |
|---|---|
| #405 criteria | Define thresholds on **measured** features (LUFS, dBTP, clip ratio, cutoff Hz), not model opinion |
| #406 preprocessing | Becomes the core: decode + compute the feature vector |
| #404 / #407 Mastra tool | The tool sends the **feature vector** to the Nemotron NIM; no audio upload to NVIDIA needed, which also keeps the privacy posture in `THIRD_PARTY_AI_SECURITY_REVIEW.md` |
| #408 aggregation, #428 tests | Deterministic floor plus LLM for borderline cases, so they're testable offline |
| #414 feedback UI | `reasons[]` can cite real numbers ("clipping detected: 0.4% of samples") |
| #423–#425 rate limit / cost / fallback | If the NIM is unavailable, fall back to the deterministic verdict instead of blocking uploads |

## 6. Open questions

- Commercial licensing: is an NVIDIA agreement for Music Flamingo worth exploring, if richer musical feedback becomes a product goal?
- Do per-genre thresholds (#431) need different loudness targets (e.g. classical vs EDM)?
- Where does decoding run (upload worker vs job queue #411), and what's the maximum file duration and size?

---

## Sources

- NVIDIA ASR NIM (model list, container deployment): https://docs.nvidia.com/nim/speech/latest/asr/index.html
- NVIDIA TTS NIM: https://docs.nvidia.com/nim/speech/latest/tts/index.html
- Maxine BNR NIM overview: https://docs.nvidia.com/nim/maxine/bnr/latest/overview.html
- Maxine Studio Voice NIM: https://docs.nvidia.com/nim/maxine/studio-voice-h4m/1.2.0/overview.html
- Maxine Audio Effects SDK (Audio Super-Resolution, noise removal): https://docs.nvidia.com/maxine/afx/latest/AboutTheEffects/AboutNoiseRemovalBackgroundNoiseSuppression.html
- Audio Flamingo 3 model card (license, limits): https://huggingface.co/nvidia/audio-flamingo-3
- Music Flamingo model card (license, limits): https://huggingface.co/nvidia/music-flamingo-hf
- Audio Flamingo repository: https://github.com/NVIDIA/audio-flamingo
