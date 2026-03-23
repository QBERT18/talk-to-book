"use client";

import { useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  SentIcon, 
  UserIcon, 
  BotIcon, 
  ArrowLeft02Icon,
  Loading03Icon
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export default function ChatPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I've read this book. Ask me anything about it!",
      createdAt: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Mock assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I received your message: "${userMessage.content}". This is a placeholder for the RAG-powered response.`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col flex-1 max-w-4xl mx-auto w-full border-x bg-background overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center gap-4 p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link 
          href={`/books/${slug}`}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          title="Back to Book Details"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
        </Link>
        <div>
          <h1 className="font-bold text-lg leading-tight truncate max-w-[250px] sm:max-w-md">
            Chatting with Book
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            {slug.replace(/-/g, " ")}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <HugeiconsIcon icon={m.role === "user" ? UserIcon : BotIcon} size={16} />
              </div>
              <div
                className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted text-foreground rounded-tl-none"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                <div className={`text-[10px] mt-1 opacity-70 ${
                  m.role === "user" ? "text-right" : "text-left"
                }`}>
                  {`${String(m.createdAt.getHours()).padStart(2, '0')}:${String(m.createdAt.getMinutes()).padStart(2, '0')}`}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[75%] flex-row">
              <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                <HugeiconsIcon icon={BotIcon} size={16} />
              </div>
              <div className="rounded-2xl px-4 py-2 text-sm bg-muted text-foreground rounded-tl-none flex items-center gap-2">
                <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSend} className="relative flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something about the book..."
            className="flex-1 min-h-[44px] max-h-32 p-3 pr-12 rounded-xl border bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 transition-opacity"
          >
            <HugeiconsIcon icon={SentIcon} size={20} />
          </button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          Press Enter to send, Shift + Enter for new line.
        </p>
      </div>
    </div>
  );
}
