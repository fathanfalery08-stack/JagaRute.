// netlify/functions/ask-ai.js
// Versi Gemini (gratis) — pakai Google AI Studio API key, bukan Anthropic.
// Fungsi ini jalan di server Netlify (bukan di browser), jadi API key
// aman tersimpan dan tidak pernah terkirim ke pengunjung website.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { system, messages } = JSON.parse(event.body || '{}');

    // Ubah format pesan gaya Anthropic (role: user/assistant) jadi gaya
    // Gemini (role: user/model) — frontend tidak perlu tahu bedanya.
    const contents = (messages || []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        generationConfig: { maxOutputTokens: 500 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      };
    }

    // Ubah balasan Gemini jadi format yang sama seperti yang dipakai
    // frontend (gaya Anthropic: { content: [{ text: "..." }] }).
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: [{ text }] }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
