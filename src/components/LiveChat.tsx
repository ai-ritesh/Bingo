import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { MessageSquare, Send, X, MessageCircle } from 'lucide-react';
import { ChatMessage, Player } from '../types';

interface LiveChatProps {
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentPlayerId: string;
  players: Record<string, Player>;
}

export default function LiveChat({
  chatHistory = [],
  onSendMessage,
  currentPlayerId,
  players
}: LiveChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Monitor incoming messages for unread badge
  useEffect(() => {
    if (!isOpen && chatHistory.length > 0) {
      setUnreadCount((prev) => prev + 1);
    }
  }, [chatHistory.length, isOpen]);

  // Handle auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setMessageText('');
  };

  return (
    <div id="live-chat-widget" className="fixed bottom-6 right-6 z-40 font-sans">
      {/* Expanded Chat Popup Window */}
      {isOpen ? (
        <div className="w-80 h-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Live Room Chat
              </h4>
            </div>
            <button
              onClick={toggleChat}
              className="p-1 rounded-lg hover:bg-zinc-150 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700 stroke-[1.5]" />
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 font-medium">
                  No messages yet. Send a message to start chatting!
                </p>
              </div>
            ) : (
              chatHistory.map((msg) => {
                const isMe = msg.senderId === currentPlayerId;
                const playerObj = players[msg.senderId];
                const isHost = playerObj?.isHost;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                        {msg.senderName}
                      </span>
                      {isHost && (
                        <span className="text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0.2 rounded font-extrabold uppercase">
                          HOST
                        </span>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>

          {/* Form Footer */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex gap-2"
          >
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <button
              type="submit"
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/15"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      ) : (
        /* Floating Chat Bubble Button */
        <button
          onClick={toggleChat}
          className="relative p-4 bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.05] active:scale-95 text-white rounded-full shadow-2xl transition-all cursor-pointer flex items-center justify-center group"
          title="Open Chat"
        >
          <MessageCircle className="w-6 h-6 group-hover:rotate-6 transition-transform" />
          
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-zinc-950 animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
