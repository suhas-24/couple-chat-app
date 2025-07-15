import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Mic, MicOff, Globe, Heart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTamilInput, useTanglish } from '@/hooks/useTanglish';
import { useMessageSendAnimation, useSparkleAnimation } from '@/lib/romanticAnimations';

interface MessageInputProps {
  onSendMessage: (message: string, type?: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  romanticeMode?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
  placeholder = "Type a message...",
  className,
  romanticeMode = false
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Romantic animations
  const sendAnimation = useMessageSendAnimation() as any;
  const triggerSendAnimation = sendAnimation?.triggerSendAnimation || (() => {});
  const SendingAnimation = sendAnimation?.SendingAnimation || (() => null);
  
  // Sparkle effect when in romantic mode
  useSparkleAnimation(romanticeMode ? inputContainerRef.current : null);

  // Tamil input support
  const {
    isEnabled: isTamilEnabled,
    inputMethod,
    toggleTamilInput,
    switchInputMethod,
    transliterate,
  } = useTamilInput();

  // Text analysis for current message
  const { detection, renderingStyles } = useTanglish(message, {
    autoDetect: true,
    normalize: true,
  });

  // Enhanced emoji set for romantic mode
  const emojis = romanticeMode 
    ? ['😊', '😍', '🥰', '😘', '💕', '❤️', '💖', '💝', '🌹', '✨', '🎉', '👏', '🤗', '💐', '🦋', '🌸', '💞', '🌺']
    : ['😊', '😍', '🥰', '😘', '💕', '❤️', '💖', '💝', '🌹', '✨', '🎉', '👏', '🤗', '😂', '🥺', '😴', '🤤', '😋'];

  // Detect romantic content
  const isRomanticMessage = React.useMemo(() => {
    const romanticWords = ['love', 'darling', 'sweetheart', 'baby', 'honey', 'dear', 'heart', 'kiss', 'hug', 'miss', 'beautiful', 'gorgeous', 'cute', 'sweet'];
    const romanticEmojis = ['❤️', '💕', '💖', '💝', '🌹', '💐', '💋', '😘', '🥰', '😍', '💞', '💘'];
    
    const lowerMessage = message.toLowerCase();
    const hasRomanticWords = romanticWords.some(word => lowerMessage.includes(word));
    const hasRomanticEmojis = romanticEmojis.some(emoji => message.includes(emoji));
    
    return hasRomanticWords || hasRomanticEmojis;
  }, [message]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const processedValue = isTamilEnabled ? transliterate(value) : value;
    setMessage(processedValue);

    if (processedValue.length > 0 && !isTyping) {
      setIsTyping(true);
      onTypingStart?.();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingStop?.();
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      // Trigger send animation if romantic message
      if (isRomanticMessage) {
        triggerSendAnimation();
      }
      
      // Determine message type
      const messageType = isRomanticMessage ? 'love-note' : 'text';
      
      onSendMessage(message.trim(), messageType);
      setMessage('');
      setIsTyping(false);
      onTypingStop?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    
    // Toggle Tamil input with Ctrl+Shift+T
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      toggleTamilInput();
    }
    
    // Switch input method with Ctrl+Shift+M
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      switchInputMethod(inputMethod === 'transliteration' ? 'direct' : 'transliteration');
    }
  };

  const handleEmojiClick = (emoji: string) => {
    const newMessage = message + emoji;
    setMessage(newMessage);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      // Stop recording logic here
    } else {
      setIsRecording(true);
      // Start recording logic here
    }
  };

  const getInputClassName = () => {
    const baseClasses = "w-full px-4 py-3 pr-12 border rounded-full resize-none focus:outline-none max-h-32 overflow-y-auto transition-all duration-300";
    
    if (romanticeMode || isRomanticMessage) {
      return cn(
        baseClasses,
        "romantic-message-input",
        "border-pink-300 bg-gradient-to-r from-pink-50 to-rose-50 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 placeholder-pink-400",
        "dark:from-dark-romantic-surface dark:to-dark-romantic-card dark:bg-dark-romantic-surface dark:border-dark-romantic-border dark:text-dark-romantic-text dark:placeholder-dark-romantic-text-secondary"
      );
    }
    
    return cn(
      baseClasses,
      "border-gray-300 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-500",
      "dark:bg-dark-romantic-surface dark:border-dark-romantic-border dark:text-dark-romantic-text dark:placeholder-dark-romantic-text-secondary"
    );
  };

  const getSendButtonClassName = () => {
    const baseClasses = "flex-shrink-0 p-3 rounded-full transition-all duration-300 relative overflow-hidden";
    
    if (isRomanticMessage) {
      return cn(
        baseClasses,
        "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105"
      );
    }
    
    return cn(
      baseClasses,
      message.trim() && !disabled
        ? "bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg"
        : "bg-gray-200 text-gray-400 cursor-not-allowed"
    );
  };

  return (
    <div className={cn("relative", className)}>
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className={cn(
          "absolute bottom-full left-0 mb-2 p-4 rounded-xl shadow-lg border grid grid-cols-6 gap-2 z-10 animate-slide-in-with-love",
          romanticeMode ? "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200" : "bg-white border-gray-200"
        )}>
          {emojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => handleEmojiClick(emoji)}
              className={cn(
                "text-xl p-2 rounded-lg transition-all duration-200 hover:scale-110",
                romanticeMode ? "hover:bg-pink-100" : "hover:bg-gray-100"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Tamil Input Controls */}
      <div className="flex items-center gap-2 mb-2 text-xs">
        <button
          type="button"
          onClick={toggleTamilInput}
          className={cn(
            'px-2 py-1 rounded-md border transition-all duration-200',
            isTamilEnabled
              ? 'bg-primary text-white border-primary'
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          )}
          disabled={disabled}
          title="Toggle Tamil input (Ctrl+Shift+T)"
        >
          <Globe className="w-3 h-3 mr-1 inline" />
          {isTamilEnabled ? 'த' : 'EN'}
        </button>
        
        {isTamilEnabled && (
          <select
            value={inputMethod}
            onChange={(e) => switchInputMethod(e.target.value as 'transliteration' | 'direct')}
            className="px-2 py-1 text-xs border rounded-md bg-white"
            disabled={disabled}
            title="Switch input method (Ctrl+Shift+M)"
          >
            <option value="transliteration">Transliteration</option>
            <option value="direct">Direct Input</option>
          </select>
        )}
        
        {detection.language !== 'unknown' && (
          <span className="text-gray-500 flex items-center space-x-1">
            {detection.language === 'tanglish' && <><span>🌐</span><span>Tanglish</span></>}
            {detection.language === 'tamil' && <><span>த</span><span>Tamil</span></>}
            {detection.language === 'english' && <><span>🇺🇸</span><span>English</span></>}
          </span>
        )}
      </div>

      {/* Romantic mode indicator */}
      {isRomanticMessage && (
        <div className="flex items-center space-x-2 mb-2 text-xs text-pink-600 animate-slide-in-with-love">
          <Heart className="w-3 h-3 animate-heartbeat" />
          <span>Romantic message detected</span>
          <Sparkles className="w-3 h-3 animate-sparkle" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        {/* File attachment */}
        <button
          type="button"
          className={cn(
            "flex-shrink-0 p-2 rounded-full transition-all duration-200",
            romanticeMode 
              ? "text-pink-500 hover:text-pink-700 hover:bg-pink-50" 
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          )}
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Voice recording */}
        <button
          type="button"
          onClick={toggleRecording}
          className={cn(
            "flex-shrink-0 p-2 rounded-full transition-all duration-200",
            isRecording 
              ? "text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100"
              : romanticeMode
              ? "text-pink-500 hover:text-pink-700 hover:bg-pink-50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          )}
          disabled={disabled}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Message input */}
        <div className="flex-1 relative" ref={inputContainerRef}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              getInputClassName(),
              isTamilEnabled || detection.hasUnicode ? 'font-tanglish tamil-input' : 'font-sans',
              isFocused && (romanticeMode || isRomanticMessage) && "shadow-lg shadow-pink-500/10"
            )}
            style={detection.hasUnicode ? renderingStyles : undefined}
            rows={1}
          />
          
          {/* Romantic input effects */}
          {(romanticeMode || isRomanticMessage) && isFocused && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 opacity-5 animate-gentle-pulse pointer-events-none" />
          )}
          
          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={cn(
              "absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-200",
              romanticeMode || isRomanticMessage
                ? "text-pink-500 hover:text-pink-700 hover:scale-110"
                : "text-gray-500 hover:text-gray-700"
            )}
            disabled={disabled}
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className={getSendButtonClassName()}
        >
          {/* Romantic button effects */}
          {isRomanticMessage && (
            <div className="absolute inset-0 bg-gradient-to-r from-pink-300 to-rose-300 opacity-20 animate-gentle-pulse" />
          )}
          
          {/* Button icon */}
          <div className="relative z-10">
            {isRomanticMessage ? (
              <Heart className="w-5 h-5 animate-heartbeat" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </div>
          
          {/* Sparkle effects for romantic button */}
          {isRomanticMessage && (
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full animate-sparkle opacity-70" />
              <div className="absolute bottom-1 left-1 w-1 h-1 bg-white rounded-full animate-sparkle opacity-50" style={{ animationDelay: '0.8s' }} />
            </div>
          )}
        </button>
      </form>
      
      {/* Send animation overlay */}
      <SendingAnimation />
    </div>
  );
};

export default MessageInput;