'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  LogOut,
  Users,
  MessageSquarePlus,
  UserPlus,
  Settings,
  Loader2,
  Circle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { usePresence } from '@/lib/presence-store';
import type { ChatWithDetails, SessionUser } from '@/lib/types';

interface SidebarProps {
  currentUser: SessionUser;
  chats: ChatWithDetails[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onLogout: () => void;
  onCreateGroup: () => void;
  onStartDM: () => void;
  onEditStatus: () => void;
  onEditProfile: () => void;
  loading: boolean;
  isMobile: boolean;
  onBack?: () => void;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function formatChatTime(timestamp: string | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function Sidebar({
  currentUser,
  chats,
  activeChatId,
  onSelectChat,
  onLogout,
  onCreateGroup,
  onStartDM,
  onEditStatus,
  onEditProfile,
  loading,
  isMobile,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const presence = usePresence();

  const filteredChats = chats.filter((chat) => {
    const name =
      chat.is_group
        ? chat.name || 'Unnamed Group'
        : chat.participants?.find((p) => p.user_id !== currentUser.id)?.user?.username ||
          'Unknown';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getChatName = (chat: ChatWithDetails): string => {
    if (chat.is_group) return chat.name || 'Unnamed Group';
    const other = chat.participants?.find((p) => p.user_id !== currentUser.id);
    return other?.user?.username || 'Unknown';
  };

  const getChatAvatar = (chat: ChatWithDetails): string => {
    if (chat.is_group) return (chat.name || 'G').slice(0, 2).toUpperCase();
    const other = chat.participants?.find((p) => p.user_id !== currentUser.id);
    return getInitials(other?.user?.username || '?');
  };

  const getOtherUserId = (chat: ChatWithDetails): string | null => {
    if (chat.is_group) return null;
    const other = chat.participants?.find((p) => p.user_id !== currentUser.id);
    return other?.user_id || null;
  };

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="border-b border-neutral-800 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-neutral-800 bg-neutral-900">
            <AvatarImage src={currentUser.avatar_url || undefined} alt={currentUser.username} />
            <AvatarFallback className="bg-neutral-900 text-white text-sm font-medium">
              {getInitials(currentUser.username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {currentUser.username}
            </p>
            <p className="truncate text-xs text-neutral-500">
              {currentUser.status_message || 'No status set'}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-neutral-400 hover:bg-neutral-900 hover:text-white"
            onClick={onEditProfile}
            title="Account settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-neutral-400 hover:bg-neutral-900 hover:text-white"
            onClick={onLogout}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={onCreateGroup}
            className="flex-1 bg-white text-black hover:bg-neutral-200 text-xs font-medium"
            size="sm"
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            New Group
          </Button>
          <Button
            onClick={onStartDM}
            variant="outline"
            className="flex-1 border-neutral-800 bg-transparent text-neutral-300 hover:bg-neutral-900 hover:text-white text-xs font-medium"
            size="sm"
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            New Chat
          </Button>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-9 border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 focus:border-neutral-600 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <MessageSquarePlus className="mb-3 h-8 w-8 text-neutral-700" />
            <p className="text-sm text-neutral-500">
              {searchQuery ? 'No chats found' : 'No chats yet. Start a new conversation!'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {filteredChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const otherUserId = getOtherUserId(chat);
              const isOnline = otherUserId ? presence[otherUserId] || false : false;
              const lastMsg = chat.last_message;
              const unread = chat.unread_count && chat.unread_count > 0;

              return (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'bg-neutral-900'
                      : 'hover:bg-neutral-900/50'
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-11 w-11 border border-neutral-800 bg-neutral-900">
                      <AvatarFallback className="bg-neutral-900 text-white text-sm font-medium">
                        {getChatAvatar(chat)}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-white">
                        {getChatName(chat)}
                      </p>
                      <span className="shrink-0 text-[10px] text-neutral-500">
                        {formatChatTime(lastMsg?.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-neutral-500">
                        {lastMsg?.message_text || 'No messages yet'}
                      </p>
                      {unread && (
                        <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-black">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
