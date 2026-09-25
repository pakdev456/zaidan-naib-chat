'use client';

import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  messageId: string;
  messageText: string;
  senderName: string;
  timestamp: string;
  isOwn: boolean;
  isGroup: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  onEdit?: (messageId: string, text: string) => void;
  onDelete?: (messageId: string) => void;
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
  senderName,
  timestamp,
  isOwn,
  isGroup,
  attachmentUrl,
  attachmentName,
  attachmentType,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex w-full animate-message-in',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 sm:max-w-[60%]',
          isOwn
            ? 'bg-white text-black rounded-br-md'
            : 'bg-neutral-900 text-white rounded-bl-md border border-neutral-800'
        )}
      >
        {isGroup && !isOwn && (
          <p className="mb-1 text-xs font-semibold text-neutral-400">
            {senderName}
          </p>
        )}
        {attachmentUrl && attachmentType?.startsWith('image/') && (
          <a href={attachmentUrl} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-lg">
            <img src={attachmentUrl} alt={attachmentName || 'Attached image'} className="max-h-72 max-w-full object-contain" />
          </a>
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
            {messageText}
          </p>
        )}
        {isOwn && (onEdit || onDelete) && (
          <div className="mt-2 flex justify-end gap-2 text-[10px] opacity-70">
            {onEdit && messageText && (
              <button type="button" onClick={() => onEdit(messageId, messageText)} className="hover:underline">Edit</button>
            )}
            {onDelete && (
              <button type="button" onClick={() => onDelete(messageId)} className="hover:underline">Delete</button>
            )}
          </div>
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
    </div>
  );
}
