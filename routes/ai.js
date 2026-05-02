const express = require('express');
const router = express.Router();

// Ensure fetch is available (Node 18+ has global fetch)
const fetchFn = typeof fetch === 'function'
  ? fetch
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// Groq model identifiers (add more as Groq releases new models)
const GROQ_MODELS = new Set([
  'llama3-8b-8192',
  'llama3-70b-8192',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'gemma-7b-it',
]);

// POST /api/ai/chat
// Body: { messages?: [{ role: 'system'|'user'|'assistant', content: string }], prompt?: string, model?: string, temperature?: number }
router.post('/chat', async (req, res) => {
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey   = process.env.GROQ_API_KEY;

    const { messages = [], prompt, model = 'gemini-2.0-flash', temperature = 0.7 } = req.body || {};

    let chatMessages = Array.isArray(messages) ? messages.slice(-20) : [];
    if (!chatMessages.length && typeof prompt === 'string' && prompt.trim().length > 0) {
      chatMessages = [
        { role: 'system', content: 'You are an accurate, concise assistant in a mobile chat app.' },
        { role: 'user', content: prompt.trim() }
      ];
    }

    if (!chatMessages.length) {
      return res.status(400).json({ success: false, message: 'messages or prompt is required' });
    }

    // ── GROQ ─────────────────────────────────────────────────────────────────
    if (GROQ_MODELS.has(model)) {
      if (!groqKey) {
        return res.status(500).json({ success: false, message: 'GROQ_API_KEY not configured on server' });
      }

      const response = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          temperature,
          max_tokens: 1024,
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data?.error?.message || `Groq API error (status ${response.status})`;
        return res.status(response.status).json({ success: false, message });
      }

      const reply = data?.choices?.[0]?.message?.content?.trim() || '';
      return res.json({ success: true, data: { reply, provider: 'groq', model } });
    }

    // ── GEMINI ────────────────────────────────────────────────────────────────
    if (geminiKey) {
      let systemInstructionText = '';
      const contents = [];
      for (const m of chatMessages) {
        if (!m || !m.content) continue;
        if (m.role === 'system') { systemInstructionText = m.content; continue; }
        const role = m.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: m.content }] });
      }

      if (!systemInstructionText) {
        systemInstructionText = 'You are an accurate, concise assistant in a mobile chat app.';
      }

      const MODEL_ALIASES = {
        'gemini-1.5-flash':        'gemini-2.0-flash',
        'gemini-1.5-flash-latest': 'gemini-2.0-flash',
        'gemini-1.5-pro':          'gemini-2.0-flash',
        'gemini-1.5-pro-latest':   'gemini-2.0-flash',
        'gemini-pro':              'gemini-2.0-flash',
      };
      const rawModel = (typeof model === 'string' && model.startsWith('gemini')) ? model : 'gemini-2.0-flash';
      const geminiModel = MODEL_ALIASES[rawModel] ?? rawModel;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${geminiKey}`;

      const response = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { role: 'system', parts: [{ text: systemInstructionText }] },
          contents,
          generationConfig: { temperature }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data?.error?.message || `Gemini API error (status ${response.status})`;
        return res.status(response.status).json({ success: false, message });
      }

      const reply = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join('\n').trim() || '';
      return res.json({ success: true, data: { reply, provider: 'gemini', model: geminiModel } });
    }

    return res.status(500).json({ success: false, message: 'No AI API key configured. Set GROQ_API_KEY or GEMINI_API_KEY.' });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ success: false, message: 'Server error while contacting AI' });
  }
});

module.exports = router;
