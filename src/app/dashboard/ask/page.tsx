'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Sparkles, ArrowRight, User, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

const starterQuestions = [
  'How many new customers did I get this month?',
  "What's my average review rating?",
  'Who are my top 5 customers by spending?',
  'Which day of the week generates the most revenue?',
  'How are my catering leads performing?',
  "What's my customer retention rate?",
];

export default function AskAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendQuestion = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: question.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      const aiMessage: Message = {
        role: 'assistant',
        content: data.answer || 'Sorry, I could not generate a response.',
        suggestions: data.suggestions || [],
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    sendQuestion(suggestion);
  };

  const handleStarterClick = (question: string) => {
    setInput(question);
    sendQuestion(question);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-seat-red/10 rounded-lg">
            <MessageCircle size={20} className="text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ask SeatSignals</h1>
            <p className="text-sm text-zinc-400">
              Ask anything about your restaurant in plain English
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-4 pr-1">
        {messages.length === 0 ? (
          /* Starter questions */
          <div className="flex flex-col items-center justify-center h-full">
            <div className="p-3 bg-seat-red/10 rounded-full mb-4">
              <Sparkles size={28} className="text-seat-red" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              What would you like to know?
            </h2>
            <p className="text-sm text-zinc-500 mb-8 text-center max-w-md">
              Ask me anything about your customers, revenue, reviews, or operations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {starterQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleStarterClick(q)}
                  className="flex items-center gap-3 p-4 bg-seat-card border border-seat-border rounded-xl text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-colors group"
                >
                  <ArrowRight
                    size={14}
                    className="text-zinc-600 group-hover:text-seat-red transition-colors flex-shrink-0"
                  />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Conversation */
          <>
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === 'user' ? (
                  /* User bubble */
                  <div className="flex justify-end">
                    <div className="flex items-start gap-2 max-w-[80%]">
                      <div className="bg-seat-red/20 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
                        {msg.content}
                      </div>
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-seat-red/20 flex items-center justify-center mt-1">
                        <User size={14} className="text-seat-red" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* AI response */
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-seat-card border border-seat-border flex items-center justify-center mt-1">
                        <Bot size={14} className="text-seat-red" />
                      </div>
                      <div>
                        <div className="bg-seat-card border border-seat-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                        {/* Suggestion chips */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {msg.suggestions.map((s, j) => (
                              <button
                                key={j}
                                onClick={() => handleSuggestionClick(s)}
                                className="px-3 py-1.5 text-xs text-zinc-400 border border-seat-border rounded-full hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-seat-card border border-seat-border flex items-center justify-center mt-1">
                    <Bot size={14} className="text-seat-red" />
                  </div>
                  <div className="bg-seat-card border border-seat-border rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                      <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                      <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 pt-4 border-t border-seat-border">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your restaurant..."
            disabled={loading}
            className="flex-1 bg-seat-card border border-seat-border rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-seat-red/50 focus:ring-1 focus:ring-seat-red/20 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 bg-seat-red hover:bg-seat-red-dark rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
