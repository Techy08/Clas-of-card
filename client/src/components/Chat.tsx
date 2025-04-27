import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useChatStore } from "@/lib/stores/useChatStore";
import { useGameStore } from "@/lib/stores/useGameStore";
import { useSocketStore } from "@/lib/stores/useSocketStore";

const Chat = () => {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { messages, addMessage } = useChatStore();
  const { players, myPlayerId } = useGameStore();
  const { socket } = useSocketStore();
  
  const myName = players.find(p => p.id === myPlayerId)?.name || "You";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Send message to server
    if (socket) {
      socket.emit("chat_message", {
        content: message,
        sender: myName,
      });
    }
    
    // Add message to local state
    addMessage({
      id: Date.now().toString(),
      content: message,
      sender: myName,
      timestamp: new Date().toISOString(),
      isFromMe: true,
    });
    
    // Clear input
    setMessage("");
    
    // Re-focus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Game Chat</h2>
      </div>
      
      <ScrollArea 
        ref={scrollRef}
        className="flex-1 p-4"
      >
        <div className="space-y-4">
          <div className="bg-muted/50 rounded p-3 text-center text-sm">
            <p>Welcome to the game chat!</p>
            <p>Be respectful and have fun 😊</p>
          </div>
          
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${
                msg.isFromMe ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.isFromMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold text-xs ${
                    msg.isFromMe ? "text-primary-foreground/90" : "text-foreground/90"
                  }`}>
                    {msg.sender}
                  </span>
                  <span className={`text-xs ${
                    msg.isFromMe ? "text-primary-foreground/70" : "text-foreground/70"
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="break-words">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} type="submit">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
