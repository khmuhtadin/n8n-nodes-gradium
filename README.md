# n8n-nodes-gradium

An independent community node for [Gradium](https://gradium.ai/). Not affiliated with or endorsed by Gradium.

## Install

In a self-hosted n8n instance, go to **Settings > Community nodes > Install**, enter `n8n-nodes-gradium`, and confirm. Alternatively install it in your n8n custom extensions directory and restart n8n. This package has not been published to npm yet.

## Credentials

Create an API key in your Gradium account and add a **Gradium API** credential in n8n. The node sends the key in `x-api-key`. The credential test calls the authenticated credits endpoint; it does not generate audio.

## Operations

- **Text to Speech**: produce raw audio in an n8n binary property. Choose a voice ID and format. [Docs](https://docs.gradium.ai/api-reference/endpoint/tts-post).
- **Speech to Text**: send an input binary WAV, 24 kHz 16-bit mono PCM, or Ogg Opus file. Set a language code or `any` for detection. The node buffers and parses NDJSON and returns text plus messages. [Docs](https://docs.gradium.ai/api-reference/endpoint/stt-post).
- **List Voices** and **Get Voice**: list account/catalog voices or fetch one by ID. [OpenAPI](https://docs.gradium.ai/api-reference/openapi.json).
- **Get Credits**: inspect the current credit balance. [Docs](https://docs.gradium.ai/api-reference/endpoint/get-credits).

The OpenAPI server is `https://api.gradium.ai/api` and its TTS path is `/speech/tts`, giving `https://api.gradium.ai/api/speech/tts`. `/post/speech/tts` is not a path in that spec. Operations may consume credits; check Gradium's current pricing. TTS and ASR buffer whole responses/files, so use suitable size limits. The icon is a neutral placeholder, not a Gradium logo.

## Example

Import `examples/text-to-speech.json`, assign your credential and replace the voice ID. Run it and inspect the output binary `data` property.

## Development

Run `npm ci --ignore-scripts`, `npm run build`, `npm run lint`, and `npm test`.

## About the author

Khairul Muhtadin, n8n Ambassador: https://www.linkedin.com/in/khmuhtadin
