# Threlte Live - 3D VRM Avatar Streaming Platform

A SvelteKit application for live-streaming 3D VRM avatars with AI-powered chat, text-to-speech, mixamo animations.

![Banner!](showcase.png 'Showcase')
[Click to see showcase video](showcase.mp4)

## Features

- Threlte/Three.js for 3D rendering
- VRM avatar loading and animation with @pixiv/three-vrm
- Google Generative AI for conversational responses
- Text-to-speech with lip-sync — pluggable provider (ElevenLabs or 60db)
- Chat interface
- Mixamo animation integration

See [roadmap.md](roadmap.md) for full details and planned features.

### Text-to-Speech and Lip-Sync

The app supports two interchangeable TTS providers, selected at runtime via the
`TTS_PROVIDER` environment variable. Both flow through the same `/api/tts`
endpoint and feed the identical lip-sync + animation pipeline, so the avatar
behaves consistently regardless of which provider is active.

| Provider | Endpoint | Timing data | Lip-sync source |
| --- | --- | --- | --- |
| **ElevenLabs** (default) | `/v1/text-to-speech/{voice}/with-timestamps` | Per-character alignment | Phoneme-accurate mouth shapes |
| **60db** | `/tts-synthesize` | None returned | Amplitude envelope (volume-driven mouth opening) |

**Phoneme-based lip-sync (ElevenLabs):** alignment timings are mapped to VRM
viseme blendshapes. Phonemes mapped: A, AA, AH, AE, AO, AW, AY, E, EH, ER, EY,
I, IH, IY, O, OH, OW, OY, U, UH, UW, M, B, P, F, V, TH, L, R, NEUTRAL.

**Amplitude-based lip-sync (60db):** because 60db returns audio without timing
data, the client analyzes the decoded audio's volume envelope (per-frame RMS)
and opens the mouth proportional to loudness. Speech still animates naturally,
though visemes are generic rather than phoneme-accurate.

Learn more:

- [What is a Phoneme](https://elevenlabs.io/blog/what-is-a-phoneme)
- [Prompting Controls](https://elevenlabs.io/docs/best-practices/prompting/controls)
- [60db API docs](https://docs.60db.ai/api-reference/tts/text-to-speech)

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/svelte-vrm-live.git
   cd svelte-vrm-live
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

### Environment Variables

Set the following environment variables (for example, create a `.env` file in the project root):

```bash
# Google Generative AI
GOOGLE_API_KEY=your_google_api_key

# Text-to-Speech provider selection: "elevenlabs" (default) or "60db"
TTS_PROVIDER=elevenlabs

# ElevenLabs Text-to-Speech
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# 60db Text-to-Speech (used when TTS_PROVIDER=60db)
SIXTYDB_API_KEY=your_60db_api_key
# Optional: a specific 60db voice UUID (from GET /myvoices). Omit to use the account default.
SIXTYDB_VOICE_ID=
```

`GOOGLE_API_KEY` is required for chat. For text-to-speech, set `TTS_PROVIDER`
and provide the matching API key.

### Switching TTS providers

Set `TTS_PROVIDER` and supply the matching API key:

```bash
# Use ElevenLabs (default)
TTS_PROVIDER=elevenlabs

# Use 60db
TTS_PROVIDER=60db
```

No code changes or rebuild are needed — restart the dev server to pick up the
new value. See [Text-to-Speech and Lip-Sync](#text-to-speech-and-lip-sync)
for how each provider drives the avatar.

## Developing

Start the development server:

```bash
pnpm dev
```

Open http://localhost:5173.

## Building

Build for production:

```bash
pnpm build
```

Preview:

```bash
pnpm run preview
```

## Keywords

svelte, sveltekit, threejs, threlte, vrm, 3d-avatar, ai-chat, text-to-speech, elevenlabs, 60db, lipsync, phonemes, mixamo, animations, blockchain, solana, generative-ai, youtube-streaming

## Contributing

We welcome contributions! Before we can merge your first pull request you must sign our Contributor License Agreement (CLA). When you open a PR, GitHub will display a message from the CLA bot with a link to sign.

- Individual contributors: see [docs/CLA_INDIVIDUAL.md](docs/CLA_INDIVIDUAL.md)
- Companies/corporations: see [docs/CLA_CORPORATE.md](docs/CLA_CORPORATE.md)

Once the CLA is signed, the status check will update automatically, and we’ll be able to review your contribution.

## License

AGPL (see LICENSE file)
