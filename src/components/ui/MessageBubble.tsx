import React, { useState } from 'react';
import { Heart, Smile, Reply, MoreHorizontal, Edit, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, Badge, Tooltip } from './common';

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
  const isOwnMessage = message.sender._id === currentUserId;

  const quickReactions = ['❤️', '😍', '😊', '😂', '🥰', '👏'];

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

  const handleReaction = (emoji: string) => {
    onReaction?.(message._id, emoji);
    setShowReactions(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content.text);
    setShowActions(false);
  };

  return (
    <div 
      className={cn(
        "flex items-start space-x-3 group hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors relative",
        isOwnMessage ? "flex-row-reverse space-x-reverse" : "",
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <Avatar 
        src={message.sender.avatar} 
        name={message.sender.name} 
        size="sm"
        className="flex-shrink-0"
      />

      {/* Message content */}
      <div className={cn("flex-1 min-w-0", isOwnMessage ? "text-right" : "")}>
        {/* Sender name and timestamp */}
        <div className={cn("flex items-center space-x-2 mb-1", isOwnMessage ? "justify-end" : "")}>
          <span className="text-sm font-medium text-gray-900">
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
            <span className="text-sm" title={message.content.type}>
              {getMessageTypeIcon(message.content.type)}
            </span>
          )}
        </div>

        {/* Message bubble */}
        <div 
          className={cn(
            "inline-block px-4 py-2 rounded-2xl max-w-xs sm:max-w-md break-words",
            isOwnMessage 
              ? "bg-pink-500 text-white" 
              : "bg-gray-100 text-gray-900",
            message.content.type === 'emoji' && "text-2xl py-1"
          )}
        >
          {message.content.text}
        </div>

        {/* Reactions */}
        {message.metadata?.reactions && message.metadata.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.metadata.reactions.map((reaction, index) => (
              <button
                key={index}
                onClick={() => handleReaction(reaction.emoji)}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-200 rounded-full text-sm hover:bg-gray-300 transition-colors"
              >
                <span>{reaction.emoji}</span>
                <span className="text-xs text-gray-600">1</span>
              </button>
            ))}
          </div>
        )}

        {/* Sentiment indicator */}
        {message.metadata?.sentiment && (
          <div className={cn("text-xs mt-1", getSentimentColor(message.metadata.sentiment))}>
            {message.metadata.sentiment}
          </div>
        )}

        {/* Read status */}
        {isOwnMessage && message.readBy && message.readBy.length > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            Read
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-white shadow-lg rounded-lg p-1 z-10">
          <Tooltip content="Add reaction">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
            >
              <Smile className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip content="Reply">
            <button
              onClick={() => onReply?.(message._id)}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
            >
              <Reply className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip content="Copy">
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
            >
              <Copy className="w-4 h-4" />
            </button>
          </Tooltip>

          {isOwnMessage && (
            <>
              <Tooltip content="Edit">
                <button
                  onClick={() => onEdit?.(message._id)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip content="Delete">
                <button
                  onClick={() => onDelete?.(message._id)}
                  className="p-1 hover:bg-gray-100 rounded text-red-500 hover:text-red-700"
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
        <div className="absolute top-12 right-2 flex items-center space-x-1 bg-white shadow-lg rounded-lg p-2 z-10">
          {quickReactions.map((emoji, index) => (
            <button
              key={index}
              onClick={() => handleReaction(emoji)}
              className="text-lg hover:bg-gray-100 p-1 rounded"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;