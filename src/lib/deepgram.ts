const TTS_MODEL = "aura-2-thalia-en";
const STT_MODEL = "nova-2";

function authHeader(): HeadersInit {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set");
  return {
    Authorization: `Token ${key}`,
  };
}

export async function textToSpeechMp3(text: string): Promise<Buffer> {
  const res = await fetch(
    `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(TTS_MODEL)}`,
    {
      method: "POST",
      headers: {
        ...authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram TTS failed: ${res.status} ${err}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

export async function transcribeAudio(buffer: Buffer, mimetype: string): Promise<{
  transcript: string;
  confidence: number | null;
}> {
  const params = new URLSearchParams({
    model: STT_MODEL,
    smart_format: "true",
    punctuate: "true",
  });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      ...authHeader(),
      "Content-Type": mimetype || "audio/webm",
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram STT failed: ${res.status} ${err}`);
  }
  const json = (await res.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{ transcript?: string; confidence?: number }>;
      }>;
    };
  };
  const alt = json.results?.channels?.[0]?.alternatives?.[0];
  const transcript = alt?.transcript?.trim() ?? "";
  const confidence =
    typeof alt?.confidence === "number" ? alt.confidence : null;
  return { transcript, confidence };
}
