Generated 440 Hz sine wave, thirty seconds, AAC 32 kb/s in MPEG-TS HLS segments.
No third-party audio. Regenerate with FFmpeg:

```sh
ffmpeg -f lavfi -i sine=frequency=440:duration=30 -c:a aac -b:a 32k -f hls -hls_time 2 -hls_list_size 0 -hls_segment_filename tone-%d.bin tone.m3u8
```

Playlists used by the unit tests in `tests/lib/hlsPlayer.test.ts`:

- `master.m3u8` advertises a three-rung bitrate ladder (64, 128 and 256 kb/s) for
  the bitrate fallback tests (#810). Its variant URIs point at `tone.m3u8`, and
  tests only read the `BANDWIDTH` values, so the variants are never fetched.
- `signed-short-lived.m3u8` lists segments with SigV4 presigned URLs that expire
  120 seconds after signing, to test the signed-URL refresh (#811). The host is
  `example.test`, a reserved domain, and the signature is a placeholder.
