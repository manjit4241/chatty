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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'OPENAI_API_KEY not configured on server' });
    }

    const { messages = [], prompt, model = 'gpt-4o-mini', temperature = 0.7 } = req.body || {};

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

    // Ensure there is a guiding system prompt
    const hasSystem = chatMessages.some(m => m.role === 'system');
    if (!hasSystem) {
      chatMessages.unshift({ role: 'system', content: 'You are an accurate, concise assistant in a mobile chat app.' });
    }

    const response = await fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        temperature,
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || `OpenAI API error (status ${response.status})`;
      return res.status(response.status).json({ success: false, message });
    }

    const reply = data?.choices?.[0]?.message?.content || '';
    return res.json({ success: true, data: { reply } });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ success: false, message: 'Server error while contacting AI' });
  }
});

module.exports = router;


