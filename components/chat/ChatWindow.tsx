'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MoreVertical,
  Send,
  Paperclip,
  Loader2,
  Users,
  LogOut,
  Circle,
  Trash2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { supabase } from '@/lib/supabase/client';
import { usePresence } from '@/lib/presence-store';
import type { Message, ChatParticipant, SessionUser, ChatWithDetails } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  chat: ChatWithDetails;
  currentUser: SessionUser;
  onBack: () => void;
  onChatLeft: () => void;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function ChatWindow({ chat, currentUser, onBack, onChatLeft }: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presence = usePresence();

  const isGroup = chat.is_group;
  const otherUser = chat.participants?.find((p) => p.user_id !== currentUser.id);
  const chatName = isGroup
    ? chat.name || 'Unnamed Group'
    : otherUser?.user?.username || 'Unknown';
  const otherUserId = !isGroup ? otherUser?.user_id : null;
  const isOnline = otherUserId ? presence[otherUserId] || false : false;

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const senderIds = Array.from(new Set(data.map((message) => message.sender_id)));
      const { data: senderUsers } = await supabase
        .from('users')
        .select('id, username')
        .in('id', senderIds);
      const senderMap = new Map((senderUsers || []).map((user) => [user.id, user]));
      setMessages(data.map((message) => ({
        ...message,
        sender: senderMap.get(message.sender_id),
      })) as Message[]);
    }
    setLoading(false);

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chat.id)
      .neq('sender_id', currentUser.id);
  }, [chat.id, currentUser.id]);

  const fetchParticipants = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_participants')
      .select(`
        *,
        user:users!chat_participants_user_id_fkey(id, username, status_message)
      `)
      .eq('chat_id', chat.id);
    if (!error && data) {
      setParticipants(data as unknown as ChatParticipant[]);
    }
  }, [chat.id]);

  useEffect(() => {
    fetchMessages();
    fetchParticipants();
  }, [fetchMessages, fetchParticipants]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chat.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          const { data: senderData } = await supabase
            .from('users')
            .select('id, username')
            .eq('id', newMsg.sender_id)
            .maybeSingle();
          const fallbackSender = participants.find((participant) => participant.user_id === newMsg.sender_id)?.user;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, {
              ...newMsg,
              sender: senderData || (fallbackSender ? { id: fallbackSender.id, username: fallbackSender.username } : undefined),
            }];
          });

          if (newMsg.sender_id !== currentUser.id) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat.id, currentUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || sending) return;
    setSending(true);
    setSendError('');
    const text = input.trim();
    const file = attachment;
    setInput('');
    setAttachment(null);

    let uploadedFile: {
      url: string;
      name: string;
      type: string;
      size: number;
    } | null = null;

    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${currentUser.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(path, file, { contentType: file.type || 'application/octet-stream' });

      if (uploadError) {
        setSendError('Failed to upload attachment');
        setInput(text);
        setAttachment(file);
        setSending(false);
        return;
      }

      const { data: publicUrl } = supabase.storage.from('attachments').getPublicUrl(path);
      uploadedFile = {
        url: publicUrl.publicUrl,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      };
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chat.id,
        sender_id: currentUser.id,
        message_text: text || uploadedFile?.name || '',
        attachment_url: uploadedFile?.url || null,
        attachment_name: uploadedFile?.name || null,
        attachment_type: uploadedFile?.type || null,
        attachment_size: uploadedFile?.size || null,
      })
      .select()
      .single();

    if (!error && data) {
      const msgWithSender: Message = {
        ...data,
        sender: { id: currentUser.id, username: currentUser.username },
      };
      setMessages((prev) => [...prev, msgWithSender]);
    } else {
      setInput(text);
      setAttachment(file);
      setSendError('Failed to send message');
    }
    setSending(false);
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setSendError('File is too large. Maximum size is 10 MB.');
      return;
    }
    setSendError('');
    setAttachment(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessageId || !editingText.trim()) return;
    const { error } = await supabase
      .from('messages')
      .update({ message_text: editingText.trim(), updated_at: new Date().toISOString() })
      .eq('id', editingMessageId)
      .eq('sender_id', currentUser.id);
    if (!error) {
      setMessages((prev) => prev.map((message) => message.id === editingMessageId
        ? { ...message, message_text: editingText.trim(), updated_at: new Date().toISOString() }
        : message));
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', currentUser.id);
    if (!error) setMessages((prev) => prev.filter((message) => message.id !== messageId));
  };

  const handleLeaveGroup = async () => {
    if (!confirm(`Leave "${chatName}"?`)) return;
    const { error } = await supabase
      .from('chat_participants')
      .delete()
      .eq('chat_id', chat.id)
      .eq('user_id', currentUser.id);

    if (!error) {
      onChatLeft();
    }
  };

  const handleDeleteChat = async () => {
    const action = isGroup && chat.created_by === currentUser.id ? 'Delete this group and all messages?' : 'Remove this conversation from your chat list?';
    if (!confirm(action)) return;
    const result = isGroup && chat.created_by === currentUser.id
      ? await supabase.from('chats').delete().eq('id', chat.id)
      : await supabase.from('chat_participants').delete().eq('chat_id', chat.id).eq('user_id', currentUser.id);
    if (!result.error) onChatLeft();
  };

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-3">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-neutral-400 hover:bg-neutral-900 hover:text-white md:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Avatar className="h-9 w-9 border border-neutral-800 bg-neutral-900">
          <AvatarFallback className="bg-neutral-900 text-white text-xs font-medium">
            {isGroup ? (chat.name || 'G').slice(0, 2).toUpperCase() : getInitials(chatName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-white">{chatName}</p>
          <p className="flex items-center gap-1.5 text-xs text-neutral-500">
            {isGroup ? (
              `${participants.length} members`
            ) : isOnline ? (
              <>
                <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                <span>online</span>
              </>
            ) : (
              'offline'
            )}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-neutral-400 hover:bg-neutral-900 hover:text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-neutral-800 bg-neutral-950 text-neutral-200"
          >
            {isGroup && (
              <>
                <DropdownMenuItem
                  className="hover:bg-neutral-900 focus:bg-neutral-900 cursor-pointer"
                  onClick={() => setShowMembers(true)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  View members
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-neutral-800" />
                <DropdownMenuItem
                  className="text-red-400 hover:bg-red-950 focus:bg-red-950 cursor-pointer"
                  onClick={handleLeaveGroup}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave group
                </DropdownMenuItem>
              </>
            )}
            {!isGroup && (
              <DropdownMenuItem
                className="hover:bg-neutral-900 focus:bg-neutral-900 cursor-pointer"
                onClick={() => setShowMembers(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                View participants
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-neutral-800" />
            <DropdownMenuItem
              className="text-red-400 hover:bg-red-950 focus:bg-red-950 cursor-pointer"
              onClick={handleDeleteChat}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isGroup && chat.created_by === currentUser.id ? 'Delete group' : 'Delete chat'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-neutral-500">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                messageId={msg.id}
                messageText={msg.message_text}
                senderName={msg.sender?.username || 'Unknown'}
                timestamp={msg.created_at}
                isOwn={msg.sender_id === currentUser.id}
                isGroup={isGroup}
                attachmentUrl={msg.attachment_url}
                attachmentName={msg.attachment_name}
                attachmentType={msg.attachment_type}
                onEdit={(messageId, text) => {
                  setEditingMessageId(messageId);
                  setEditingText(text);
                }}
                onDelete={handleDeleteMessage}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-800 p-3">
        {editingMessageId && (
          <div className="mb-2 rounded-lg border border-neutral-800 bg-neutral-900 p-2">
            <Input value={editingText} onChange={(event) => setEditingText(event.target.value)} className="border-neutral-700 bg-neutral-950 text-white" autoFocus />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)} className="text-neutral-400">Cancel</Button>
              <Button size="sm" onClick={handleEditMessage} className="bg-white text-black hover:bg-neutral-200">Save</Button>
            </div>
          </div>
        )}
        {attachment && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300">
            <span className="truncate">{attachment.name}</span>
            <button type="button" onClick={() => setAttachment(null)} className="ml-3 text-neutral-500 hover:text-white" aria-label="Remove attachment">
              x
            </button>
          </div>
        )}
        {sendError && <p className="mb-2 text-xs text-red-400">{sendError}</p>}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttachmentChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 text-neutral-500 hover:bg-neutral-900 hover:text-white"
            title="Attach an image or file"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 focus:border-neutral-600"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!input.trim() && !attachment) || sending}
            className="h-9 w-9 shrink-0 bg-white text-black hover:bg-neutral-200"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="border-neutral-800 bg-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isGroup ? 'Group Members' : 'Participants'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin">
            {participants.map((p) => {
              const isPOnline = presence[p.user_id] || false;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-900"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9 border border-neutral-800 bg-neutral-900">
                      <AvatarFallback className="bg-neutral-900 text-white text-xs font-medium">
                        {getInitials(p.user?.username || '?')}
                      </AvatarFallback>
                    </Avatar>
                    {isPOnline && (
                      <Circle className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-green-500 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {p.user?.username || 'Unknown'}
                      {p.user_id === currentUser.id && (
                        <span className="ml-1.5 text-xs text-neutral-500">(you)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {p.user?.status_message || 'No status'}
                    </p>
                  </div>
                  <span className={cn('text-xs', isPOnline ? 'text-green-500' : 'text-neutral-600')}>
                    {isPOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
