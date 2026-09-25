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
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
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
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username)
      `)
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as unknown as Message[]);
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

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, {
              ...newMsg,
              sender: senderData || undefined,
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
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chat.id,
        sender_id: currentUser.id,
        message_text: text,
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
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
                messageText={msg.message_text}
                senderName={msg.sender?.username || 'Unknown'}
                timestamp={msg.created_at}
                isOwn={msg.sender_id === currentUser.id}
                isGroup={isGroup}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-800 p-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 text-neutral-500 hover:bg-neutral-900 hover:text-white"
            title="Attachments (coming soon)"
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
            disabled={!input.trim() || sending}
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
