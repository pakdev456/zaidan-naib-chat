'use client';

import { cn } from '@/lib/utils';
import { Edit2, Trash2, Forward, Pin, User, CornerDownLeft, Copy } from 'lucide-react';

interface MessageBubbleProps {
  messageId: string;
  messageText: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  isOwn: boolean;
  isGroup: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  onEdit?: (messageId: string, text: string) => void;
  onDelete?: (messageId: string) => void;
  onForward?: (messageText: string) => void;
  onCopy?: (messageText: string) => void;
  onReply?: (messageId: string, messageText: string, senderName: string) => void;
  onViewImage?: (imageUrl: string) => void;
  onPin?: (messageId: string, isPinned: boolean) => void;
  onViewProfile?: (senderId: string) => void;
  isPinned?: boolean;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({
  messageId,
  messageText,
  senderId,
  senderName,
  timestamp,
  isOwn,
  isGroup,
  isPinned,
  attachmentUrl,
  attachmentName,
  attachmentType,
  onEdit,
  onDelete,
  onForward,
  onCopy,
  onReply,
  onViewImage,
  onPin,
  onViewProfile,
}: MessageBubbleProps) {
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a key={index} href={part} target="_blank" rel="noreferrer" className="underline hover:text-blue-400">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={cn(
        'group flex w-full animate-message-in items-end gap-2',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      {!isOwn && (
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button title="Forward" onClick={() => onForward?.(messageText)} className="p-1 text-neutral-500 hover:text-white rounded">
            <Forward className="h-4 w-4" />
          </button>
          <button title="Reply" onClick={() => onReply?.(messageId, messageText, senderName)} className="p-1 text-neutral-500 hover:text-white rounded">
            <CornerDownLeft className="h-4 w-4" />
          </button>
          <button title="Copy" onClick={() => onCopy?.(messageText)} className="p-1 text-neutral-500 hover:text-white rounded">
            <Copy className="h-4 w-4" />
          </button>
          <button title="Pin" onClick={() => onPin?.(messageId, !!isPinned)} className={cn("p-1 rounded", isPinned ? "text-white" : "text-neutral-500 hover:text-white")}>
            <Pin className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 sm:max-w-[60%]',
          isOwn
            ? 'bg-white text-black rounded-br-md'
            : 'bg-neutral-900 text-white rounded-bl-md border border-neutral-800'
        )}
      >
        {isGroup && !isOwn && (
          <p
            className="mb-1 text-xs font-semibold text-neutral-400 cursor-pointer hover:underline"
            onClick={() => onViewProfile?.(senderId)}
          >
            {senderName}
          </p>
        )}
        {attachmentUrl && attachmentType?.startsWith('image/') && (
          <button onClick={() => onViewImage?.(attachmentUrl)} className="mb-2 block overflow-hidden rounded-lg">
            <img src={attachmentUrl} alt={attachmentName || 'Attached image'} className="max-h-72 max-w-full object-contain" />
          </button>
        )}
        {attachmentUrl && !attachmentType?.startsWith('image/') && (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className={cn('mb-2 block truncate text-sm underline underline-offset-2', isOwn ? 'text-black/80' : 'text-white')}
          >
            {attachmentName || 'Download attachment'}
          </a>
        )}
        {messageText && messageText !== attachmentName && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {isPinned && <span className="text-yellow-500 mr-1">📌</span>}
            {renderTextWithLinks(messageText)}
          </p>
        )}
        <p
          className={cn(
            'mt-1 text-[10px]',
            isOwn ? 'text-black/50' : 'text-neutral-500'
          )}
        >
          {formatTime(timestamp)}
        </p>
      </div>

      {isOwn && (
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && messageText && (
            <button title="Edit" onClick={() => onEdit(messageId, messageText)} className="p-1 text-neutral-500 hover:text-white rounded">
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button title="Delete" onClick={() => onDelete(messageId)} className="p-1 text-neutral-500 hover:text-red-500 rounded">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {onForward && (
            <button title="Forward" onClick={() => onForward(messageText)} className="p-1 text-neutral-500 hover:text-white rounded">
              <Forward className="h-4 w-4" />
            </button>
          )}
          {onPin && (
            <button title="Pin" onClick={() => onPin(messageId, !!isPinned)} className={cn("p-1 rounded", isPinned ? "text-white" : "text-neutral-500 hover:text-white")}>
              <Pin className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
