'use client';

import { useState } from 'react';

// Context-aware support widget — wired to the real ai-agent backend module (session
// persistence + escalation are real; the generative reply itself is Phase 2, see
// docs/30-ai-support-agent.md). Rendered site-wide via layout.tsx.
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type Message = { role: 'user' | 'assistant'; content: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [suggestEscalation, setSuggestEscalation] = useState(false);

  async function ensureSession() {
    if (sessionId) return sessionId;
    const res = await fetch(`${API}/ai-agent/sessions`, { method: 'POST' });
    const data = await res.json();
    setSessionId(data.id);
    return data.id as string;
  }

  async function send() {
    if (!input.trim()) return;
    const sid = await ensureSession();
    const userMsg: Message = { role: 'user', content: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    const res = await fetch(`${API}/ai-agent/sessions/${sid}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: userMsg.content }),
    });
    const data = await res.json();
    setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    setSuggestEscalation(Boolean(data.suggestEscalation));
  }

  async function escalate() {
    if (!sessionId) return;
    await fetch(`${API}/ai-agent/sessions/${sessionId}/escalate`, { method: 'POST' });
    setMessages((m) => [...m, { role: 'assistant', content: "You're through to the team — someone will follow up shortly." }]);
    setSuggestEscalation(false);
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200 }}>
      {open && (
        <div style={{ width: 320, height: 420, background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(27,39,51,.24)', display: 'flex', flexDirection: 'column', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ background: '#1B2733', color: '#fff', padding: '14px 16px', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14 }}>
            Aluminium Store Assistant
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <p style={{ fontSize: 12.5, color: '#A9B2BD' }}>Ask about products, pricing, lead times, or specs.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? '#3E6E91' : '#F5F3EE',
                color: m.role === 'user' ? '#fff' : '#1B2733',
                padding: '8px 12px', borderRadius: 12, fontSize: 13, maxWidth: '85%',
              }}>
                {m.content}
              </div>
            ))}
            {suggestEscalation && (
              <button onClick={escalate} style={{ fontSize: 12, color: '#3E6E91', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                Talk to a human instead →
              </button>
            )}
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid #EAE6DC' }}>
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message..."
              style={{ flex: 1, border: 'none', padding: 12, fontSize: 13, outline: 'none' }}
            />
            <button onClick={send} style={{ background: '#C08A4E', color: '#fff', border: 'none', padding: '0 16px', cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        style={{
          width: 56, height: 56, borderRadius: '50%', background: '#C08A4E', color: '#fff',
          border: 'none', fontSize: 22, cursor: 'pointer', boxShadow: '0 8px 24px rgba(192,138,78,.4)',
        }}
      >
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}
