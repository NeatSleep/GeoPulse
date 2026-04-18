import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { sendAssistantMessage, extractNewsFromToolResults } from '../services/assistant';

export default function IntelAssistant({ onClose, isOpen }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      type: "assistant",
      content: "Hello! I'm your Geopolitical Intelligence Assistant. I can help you find the latest news on conflicts, diplomacy, sanctions, and other geopolitical events. Ask me anything about current world affairs!",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const conversationRef = useRef([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      id: `msg_${Date.now()}`,
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content
      }));

      // Send to backend
      const response = await sendAssistantMessage(inputValue, conversationHistory);

      if (response.success) {
        // Extract articles from tool results
        const articles = extractNewsFromToolResults(response.tool_calls);

        // Add assistant message
        const assistantMessage = {
          id: `msg_${Date.now()}`,
          type: "assistant",
          content: response.message,
          tool_calls: response.tool_calls,
          articles: articles,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else if (response.message) {
        // Rejection or error message
        const errorMessage = {
          id: `msg_${Date.now()}`,
          type: "rejection",
          content: response.message,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage = {
        id: `msg_${Date.now()}`,
        type: "error",
        content: `Connection Error: ${err.message || 'Failed to reach assistant service'}\n\n⚠️ Make sure:\n• Backend server is running (npm start in /backend)\n• Backend is running on port 5000\n• LLM API key is configured`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[70]"
          />

          {/* Assistant Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[500px] z-[70] glass-panel rounded-l-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Intelligence Assistant</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Ask me about current geopolitical events</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, idx) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600/80 text-white'
                        : message.type === 'rejection'
                        ? 'bg-red-500/20 text-red-200 border border-red-500/50 max-w-md'
                        : message.type === 'error'
                        ? 'bg-red-500/20 text-red-200 border border-red-500/50 max-w-md'
                        : 'bg-white/10 text-[var(--text-secondary)] border border-white/20'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                    {/* News Articles from Tool Results */}
                    {message.articles && message.articles.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-white/20 pt-3">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">📰 Found {message.articles.length} articles:</p>
                        {message.articles.map((article, aidx) => (
                          <motion.div
                            key={article.id || aidx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: aidx * 0.1 }}
                            className="bg-black/20 rounded p-2"
                          >
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-300 hover:text-blue-200 transition-colors break-words flex items-start gap-2 group"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2 group-hover:underline">{article.title}</span>
                            </a>
                            <p className="text-xs text-white/60 mt-1">{article.source}</p>
                            <p className="text-xs text-white/40 mt-0.5">{new Date(article.publishedAt).toLocaleDateString()}</p>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-white/40 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 border border-white/20 px-4 py-3 rounded-lg flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-white/60">Fetching resources...</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about geopolitical events..."
                  disabled={isLoading}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-xs text-white/40 mt-2 text-center">
                I can fetch real-time news and validate geopolitical relevance
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
