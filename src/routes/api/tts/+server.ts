import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { synthesizeSpeech, TTSProviderError } from '$lib/server/tts';

interface TTSRequestBody {
	text: string;
}

export const POST: RequestHandler = async ({ request }) => {
	let requestData: TTSRequestBody;
	try {
		requestData = await request.json();
	} catch (e) {
		throw error(400, "Invalid request body: Must be valid JSON with a 'text' property.");
	}

	const { text } = requestData;

	if (!text || typeof text !== 'string') {
		throw error(400, "Missing or invalid 'text' property in request body.");
	}

	try {
		const result = await synthesizeSpeech(text);

		return json({
			audio_base64: result.audioBase64,
			provider: result.provider,
			// Client shape: { character, start, end }. Empty for providers without
			// alignment (60db) — the client then derives timings from amplitude.
			phonemes: result.phonemes
		});
	} catch (e: any) {
		console.error('Error proxying TTS request:', e);
		if (e instanceof TTSProviderError) {
			throw error(e.status, e.message);
		}
		throw error(500, `Internal server error: ${e.message || 'Unknown error'}`);
	}
};
