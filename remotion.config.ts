import { Config } from '@remotion/cli/config';

// Social-ready master: H.264 at high quality, yuv420p for universal playback,
// AAC at 320 kbps so the voiceover and SFX survive platform re-encodes.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setAudioBitrate('320k');
Config.setOverwriteOutput(true);
