const express = require('express');
const router = express.Router();

// Ensure fetch is available (Node 18+ has global fetch)
const fetchFn = typeof fetch === 'function'
  ? fetch
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// POST /api/ai/chat
// Body: { messages?: [{ role: 'system'|'user'|'assistant', content: string }], prompt?: string, model?: string, temperature?: number }
router.post('/chat', async (req, res) => {
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    const { messages = [], prompt, model = 'gemini-1.5-flash', temperature = 0.7 } = req.body || {};

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

    // Require Gemini key and use Gemini only
    if (geminiKey) {
      // Map our messages to Gemini format
      let systemInstructionText = '';
      const contents = [];
      for (const m of chatMessages) {
        if (!m || !m.content) continue;
        if (m.role === 'system') {
          systemInstructionText = m.content;
          continue;
        }
        const role = m.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: m.content }] });
      }

      if (!systemInstructionText) {
        systemInstructionText = 'You are an accurate, concise assistant in a mobile chat app.';
      }

      const geminiModel = (typeof model === 'string' && model.startsWith('gemini')) ? model : 'gemini-1.5-flash';
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
      return res.json({ success: true, data: { reply } });
    }

    return res.status(500).json({ success: false, message: 'GEMINI_API_KEY not configured on server' });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ success: false, message: 'Server error while contacting AI' });
  }
});

module.exports = router;


