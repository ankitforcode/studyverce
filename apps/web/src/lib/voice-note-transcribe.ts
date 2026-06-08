const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function transcribeVoiceNoteAudio(
  audio: Blob,
  filename: string
): Promise<{ transcript: string | null; error: string | null }> {
  if (!OPENAI_API_KEY) {
    return {
      transcript: null,
      error: "Transcription is not configured yet. You can still play and share the recording.",
    };
  }

  const formData = new FormData();
  formData.append("file", audio, filename);
  formData.append("model", "whisper-1");
  formData.append("response_format", "text");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Whisper transcription failed:", res.status, detail);
      return { transcript: null, error: "Could not transcribe this voice note. Try again later." };
    }

    const transcript = (await res.text()).trim();
    return { transcript: transcript || null, error: null };
  } catch (err) {
    console.error("Whisper transcription error:", err);
    return { transcript: null, error: "Could not transcribe this voice note. Try again later." };
  }
}
