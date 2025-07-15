import React, { useState, useEffect } from 'react';
import { Heart, Smile, Reply, MoreHorizontal, Edit, Trash2, Copy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, Badge, Tooltip } from './common';
import TanglishText from './TanglishText';
import { useHeartParticles, useLoveReaction } from '@/lib/romanticAnimations';

interface MessageBubbleProps {
  message: {
    _id: string;
    content: {
      text: string;
      type: 'text' | 'emoji' | 'image' | 'voice' | 'love-note';
    };
    sender: {
      _id: string;
      name: string;
      avatar?: string;
    };
    timestamp: string;
    metadata?: {
      isEdited?: boolean;
      editedAt?: string;
      reactions?: Array<{
        user: string;
        emoji: string;
        reactedAt: string;
      }>;
      sentiment?: 'positive' | 'neutral' | 'negative' | 'romantic';
    };
    readBy?: Array<{
      user: string;
      readAt: string;
    }>;
  };
  currentUserId: string;
  onReaction?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  className?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  onReaction,
  onEdit,
  onDelete,
  onReply,
  className
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [justReacted, setJustReacted] = useState(false);
  const isOwnMessage = message.sender._id === currentUserId;
  const isLoveNote = message.content.type === 'love-note';
  const isRomantic = message.metadata?.sentiment === 'romantic';

  // Heart particles for romantic messages
  const { containerRef, isActive: heartsActive } = useHeartParticles(justReacted && (isRomantic || isLoveNote));
  const loveReaction = useLoveReaction() as any;
  const addReaction = loveReaction?.addReaction || (() => {});
  const ReactionOverlay = loveReaction?.ReactionOverlay || (() => null);

  const quickReactions = ['❤️', '😍', '😊', '😂', '🥰', '👏', '💕', '🌹'];

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'romantic': return 'text-pink-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'love-note': return '💕';
      case 'emoji': return '🎭';
      case 'voice': return '🎵';
      case 'image': return '📸';
      default: return null;
    }
  };

  const getBubbleClassName = () => {
    const baseClasses = "inline-block px-4 py-2 rounded-2xl max-w-xs sm:max-w-md break-words transition-all duration-300";
    
    if (isLoveNote) {
      return cn(
        baseClasses,
        "romantic-bubble",
        "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25 animate-gentle-pulse"
      );
    }
    
    if (isRomantic) {
      return cn(
        baseClasses,
        isOwnMessage 
          ? "romantic-bubble bg-romantic-gradient text-white shadow-lg shadow-pink-500/20" 
          : "romantic-bubble-received bg-gradient-to-r from-purple-100 to-pink-100 text-gray-900 border border-pink-200 dark:text-dark-romantic-text"
      );
    }
    
    return cn(
      baseClasses,
      isOwnMessage 
        ? "bg-primary text-white hover:shadow-lg transition-shadow dark:bg-dark-romantic-primary dark:text-dark-romantic-text" 
        : "bg-gray-100 text-gray-900 hover:bg-gray-50 transition-colors dark:bg-dark-romantic-surface dark:text-dark-romantic-text dark:hover:bg-dark-romantic-card",
      message.content.type === 'emoji' && "text-2xl py-1"
    );
  };

  const handleReaction = (emoji: string) => {
    onReaction?.(message._id, emoji);
    setShowReactions(false);
    setJustReacted(true);
    
    // Add floating reaction
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      addReaction(emoji, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
    
    setTimeout(() => setJustReacted(false), 1000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content.text);
    setShowActions(false);
  };

  return (
    <>
      <div 
        ref={containerRef}
        className={cn(
          "flex items-start space-x-3 group hover:bg-gray-50/50 px-4 py-2 rounded-lg transition-all duration-300 relative",
          isOwnMessage ? "flex-row-reverse space-x-reverse" : "",
          (isLoveNote || isRomantic) && "hover:bg-pink-50/30",
          className
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Avatar with romantic glow for love notes */}
        <div className="relative">
          <Avatar 
            src={message.sender.avatar} 
            name={message.sender.name} 
            size="sm"
            className={cn(
              "flex-shrink-0 transition-all duration-300",
              (isLoveNote || isRomantic) && "ring-2 ring-pink-300 ring-opacity-50"
            )}
          />
          {(isLoveNote || isRomantic) && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full animate-gentle-pulse">
              <Heart className="w-2 h-2 text-white m-0.5" />
            </div>
          )}
        </div>

        {/* Message content */}
        <div className={cn("flex-1 min-w-0", isOwnMessage ? "text-right" : "")}>
          {/* Sender name and timestamp */}
          <div className={cn("flex items-center space-x-2 mb-1", isOwnMessage ? "justify-end" : "")}>
            <span className={cn(
              "text-sm font-medium",
              isLoveNote ? "text-pink-600" : "text-gray-900"
            )}>
              {message.sender.name}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </span>
            {message.metadata?.isEdited && (
              <Badge variant="secondary" size="sm">
                edited
              </Badge>
            )}
            {getMessageTypeIcon(message.content.type) && (
              <span className="text-sm animate-gentle-pulse" title={message.content.type}>
                {getMessageTypeIcon(message.content.type)}
              </span>
            )}
          </div>

          {/* Message bubble */}
          <div className="relative">
            <div className={getBubbleClassName()}>
              {/* Sparkles for love notes */}
              {isLoveNote && (
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <Sparkles className="absolute top-1 right-1 w-3 h-3 text-pink-200 animate-sparkle" />
                  <Sparkles className="absolute bottom-1 left-1 w-2 h-2 text-pink-200 animate-sparkle" style={{ animationDelay: '1s' }} />
                </div>
              )}
              
              <TanglishText 
                text={message.content.text}
                autoDetect={true}
                normalize={true}
                className={cn(
                  "relative z-10",
                  message.content.type === 'emoji' && "text-2xl"
                )}
              />
            </div>
            
            {/* Romantic message effects */}
            {isRomantic && (
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 to-rose-400 rounded-2xl opacity-10 animate-gentle-pulse" />
            )}
          </div>

          {/* Reactions */}
          {message.metadata?.reactions && message.metadata.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.metadata.reactions.map((reaction, index) => (
                <button
                  key={index}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-full text-sm transition-all duration-200",
                    "bg-pink-100 hover:bg-pink-200 border border-pink-200 hover:border-pink-300",
                    "hover:scale-105 hover:shadow-sm"
                  )}
                >
                  <span className="animate-gentle-pulse">{reaction.emoji}</span>
                  <span className="text-xs text-pink-600">1</span>
                </button>
              ))}
            </div>
          )}

          {/* Sentiment indicator */}
          {message.metadata?.sentiment && (
            <div className={cn("text-xs mt-1 flex items-center space-x-1", getSentimentColor(message.metadata.sentiment))}>
              {message.metadata.sentiment === 'romantic' && <Heart className="w-3 h-3" />}
              <span>{message.metadata.sentiment}</span>
            </div>
          )}

          {/* Read status */}
          {isOwnMessage && message.readBy && message.readBy.length > 0 && (
            <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
              <span>Read</span>
              <Heart className="w-3 h-3 text-pink-400" />
            </div>
          )}
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="absolute top-2 right-2 flex items-center space-x-1 bg-white shadow-lg rounded-lg p-1 z-10 border border-gray-200">
            <Tooltip content="Add reaction">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="p-1 hover:bg-pink-50 rounded text-gray-500 hover:text-pink-600 transition-colors"
              >
                <Smile className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Reply">
              <button
                onClick={() => onReply?.(message._id)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Reply className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Copy">
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </Tooltip>

            {isOwnMessage && (
              <>
                <Tooltip content="Edit">
                  <button
                    onClick={() => onEdit?.(message._id)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </Tooltip>

                <Tooltip content="Delete">
                  <button
                    onClick={() => onDelete?.(message._id)}
                    className="p-1 hover:bg-red-50 rounded text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        )}

        {/* Quick reactions */}
        {showReactions && (
          <div className="absolute top-12 right-2 flex items-center space-x-1 bg-white shadow-lg rounded-lg p-2 z-10 border border-gray-200">
            {quickReactions.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleReaction(emoji)}
                className="text-lg hover:bg-pink-50 p-2 rounded transition-colors hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Reaction overlay */}
      {ReactionOverlay && <ReactionOverlay />}
    </>
  );
};

export default MessageBubble;