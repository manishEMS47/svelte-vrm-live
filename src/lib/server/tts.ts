import { env } from '$env/dynamic/private';

/**
 * Server-side TTS provider abstraction.
 *
 * Both providers return the same shape so the client lip-sync pipeline is
 * provider-agnostic. ElevenLabs supplies real per-character alignment in
 * `phonemes`; 60db returns no timing data, so `phonemes` is empty and the
 * client derives lip-sync timings from the audio amplitude envelope instead.
 */

export interface TTSPhoneme {
	character: string;
	start: number; // seconds
	end: number; // seconds
}

export interface TTSResult {
	/** Base64-encoded audio (mp3). */
	audioBase64: string;
	/** Per-character timings. Empty for providers without alignment (e.g. 60db). */
	phonemes: TTSPhoneme[];
	/** Which provider produced this result. */
	provider: 'elevenlabs' | '60db';
}

/** Raised by providers on a recoverable failure; carries an HTTP-ish status. */
export class TTSProviderError extends Error {
	status: number;
	constructor(message: string, status = 502) {
		super(message);
		this.name = 'TTSProviderError';
		this.status = status;
	}
}

// Non-premium ElevenLabs voice (premium voices are ~10x the cost).
const ELEVENLABS_VOICE_ID = '3XOBzXhnDY98yeWQ3GdM';

// Shared, provider-neutral voice tuning (0..1, ElevenLabs scale).
const STABILITY = 0.5;
const SIMILARITY = 0.75;

/**
 * Dispatch to the configured provider. Selected via the `TTS_PROVIDER` env var
 * ("elevenlabs" | "60db"); defaults to ElevenLabs to preserve prior behaviour.
 */
export async function synthesizeSpeech(text: string): Promise<TTSResult> {
	const provider = (env.TTS_PROVIDER || 'elevenlabs').toLowerCase();

	if (provider === '60db' || provider === 'sixtydb') {
		return synthesizeWith60db(text);
	}
	return synthesizeWithElevenLabs(text);
}

// --- ElevenLabs --------------------------------------------------------------

async function synthesizeWithElevenLabs(text: string): Promise<TTSResult> {
	const apiKey = env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		throw new TTSProviderError('ELEVENLABS_API_KEY is not set.', 500);
	}

	const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/with-timestamps`;

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			'xi-api-key': apiKey,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: JSON.stringify({
			text,
			model_id: 'eleven_flash_v2_5',
			voice_settings: {
				stability: STABILITY,
				similarity_boost: SIMILARITY
			}
		})
	});

	if (!response.ok) {
		const errorBody = await response.text();
		console.error(`ElevenLabs API error: ${response.status} ${response.statusText}`, errorBody);
		throw new TTSProviderError(`ElevenLabs request failed: ${response.statusText} - ${errorBody}`);
	}

	const data = await response.json();

	const phonemes: TTSPhoneme[] = [];
	const alignment = data.alignment;
	if (
		alignment?.characters &&
		alignment?.character_start_times_seconds &&
		alignment?.character_end_times_seconds
	) {
		const { characters } = alignment;
		const startTimes = alignment.character_start_times_seconds;
		const endTimes = alignment.character_end_times_seconds;
		for (let i = 0; i < characters.length; i++) {
			phonemes.push({ character: characters[i], start: startTimes[i], end: endTimes[i] });
		}
	} else {
		console.warn('[TTS:elevenlabs] Unexpected response structure (no alignment).');
	}

	console.log(
		`[TTS:elevenlabs] audio present: ${!!data.audio_base64}, phonemes: ${phonemes.length}`
	);

	return { audioBase64: data.audio_base64, phonemes, provider: 'elevenlabs' };
}

// --- 60db --------------------------------------------------------------------

async function synthesizeWith60db(text: string): Promise<TTSResult> {
	const apiKey = env.SIXTYDB_API_KEY;
	if (!apiKey) {
		throw new TTSProviderError('SIXTYDB_API_KEY is not set.', 500);
	}

	const endpoint = 'https://api.60db.ai/tts-synthesize';

	const body: Record<string, unknown> = {
		text,
		enhance: true,
		speed: 1,
		// 60db uses a 0..100 scale; map from the shared 0..1 tuning above.
		stability: Math.round(STABILITY * 100),
		similarity: Math.round(SIMILARITY * 100),
		output_format: 'mp3'
	};
	// Optional explicit voice (UUID from GET /myvoices); otherwise the account default is used.
	if (env.SIXTYDB_VOICE_ID) {
		body.voice_id = env.SIXTYDB_VOICE_ID;
	}

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		const errorBody = await response.text();
		console.error(`60db API error: ${response.status} ${response.statusText}`, errorBody);
		throw new TTSProviderError(`60db request failed: ${response.statusText} - ${errorBody}`);
	}

	const data = await response.json();

	if (!data.audio_base64) {
		console.error('[TTS:60db] No audio_base64 in response.', data?.message);
		throw new TTSProviderError(`60db returned no audio: ${data?.message || 'unknown error'}`);
	}

	console.log(
		`[TTS:60db] audio present: true, duration: ${data.duration_seconds ?? '?'}s ` +
			`(no alignment — client derives lip-sync from amplitude)`
	);

	// 60db has no alignment endpoint; phonemes intentionally empty.
	return { audioBase64: data.audio_base64, phonemes: [], provider: '60db' };
}
