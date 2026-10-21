Generated 440 Hz sine wave, thirty seconds, AAC 32 kb/s in MPEG-TS HLS segments.
No third-party audio. Regenerate with FFmpeg:

```sh
ffmpeg -f lavfi -i sine=frequency=440:duration=30 -c:a aac -b:a 32k -f hls -hls_time 2 -hls_list_size 0 -hls_segment_filename tone-%d.bin tone.m3u8
```
