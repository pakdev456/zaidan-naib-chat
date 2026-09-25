'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase/client';
import type { User, SessionUser } from '@/lib/types';

interface StartDMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: SessionUser;
  onChatStarted: (chatId: string) => void;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function StartDMModal({
  open,
  onOpenChange,
  currentUser,
  onChatStarted,
}: StartDMModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSearch('');
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .neq('id', currentUser.id)
      .order('username', { ascending: true });
    if (!error && data) {
      setUsers(data as User[]);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartDM = async (targetUser: User) => {
    setStarting(targetUser.id);

    const { data: existingChats } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', currentUser.id);

    if (existingChats && existingChats.length > 0) {
      const chatIds = existingChats.map((cp) => cp.chat_id);

      const { data: targetChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', targetUser.id)
        .in('chat_id', chatIds);

      if (targetChats && targetChats.length > 0) {
        const matchingChatIds = targetChats.map((tc) => tc.chat_id);

        const { data: dmChat } = await supabase
          .from('chats')
          .select('*')
          .in('id', matchingChatIds)
          .eq('is_group', false)
          .maybeSingle();

        if (dmChat) {
          setStarting(null);
          onOpenChange(false);
          onChatStarted(dmChat.id);
          return;
        }
      }
    }

    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        is_group: false,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (chatError || !newChat) {
      setStarting(null);
      return;
    }

    await supabase.from('chat_participants').insert([
      { chat_id: newChat.id, user_id: currentUser.id },
      { chat_id: newChat.id, user_id: targetUser.id },
    ]);

    setStarting(null);
    onOpenChange(false);
    onChatStarted(newChat.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-neutral-950 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Start Private Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-9 border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 focus:border-neutral-600"
            />
          </div>

          <ScrollArea className="h-64 rounded-lg border border-neutral-800">
            <div className="space-y-1 p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-500">
                  No users available
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartDM(user)}
                    disabled={starting !== null}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-neutral-900 disabled:opacity-50"
                  >
                    <Avatar className="h-9 w-9 border border-neutral-800 bg-neutral-900">
                      <AvatarFallback className="bg-neutral-900 text-white text-xs font-medium">
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {user.username}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {user.status_message || 'No status'}
                      </p>
                    </div>
                    {starting === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-neutral-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
