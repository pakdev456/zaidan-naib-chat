'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquare } from 'lucide-react';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { CreateGroupModal } from '@/components/chat/CreateGroupModal';
import { StartDMModal } from '@/components/chat/StartDMModal';
import { EditStatusModal } from '@/components/chat/EditStatusModal';
import { getSession, clearSession } from '@/lib/auth';
import {
  usePresenceTracker,
  usePresenceSubscription,
  fetchInitialPresence,
} from '@/lib/presence';
import { setBulkPresence } from '@/lib/presence-store';
import { supabase } from '@/lib/supabase/client';
import type { ChatWithDetails, SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showStartDM, setShowStartDM] = useState(false);
  const [showEditStatus, setShowEditStatus] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  usePresenceTracker(currentUser?.id || null);
  usePresenceSubscription();

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    setCurrentUser(session);
    setCheckingAuth(false);
    fetchInitialPresence().then((p) => setBulkPresence(p));
  }, [router]);

  const fetchChats = useCallback(async () => {
    if (!currentUser) return;
    setLoadingChats(true);

    const { data: participants, error: pError } = await supabase
      .from('chat_participants')
      .select(`
        chat_id,
        chat:chats!chat_participants_chat_id_fkey(*),
        user:users!chat_participants_user_id_fkey(id, username, status_message, is_admin, created_at)
      `)
      .eq('user_id', currentUser.id);

    if (pError || !participants) {
      setLoadingChats(false);
      return;
    }

    const chatMap = new Map<string, ChatWithDetails>();
    participants.forEach((p: any) => {
      const chat = p.chat as ChatWithDetails;
      if (!chatMap.has(chat.id)) {
        chatMap.set(chat.id, {
          ...chat,
          participants: [],
          last_message: null,
          unread_count: 0,
        });
      }
      const entry = chatMap.get(chat.id)!;
      entry.participants = entry.participants || [];
      entry.participants.push({
        id: p.chat_id + '_' + p.user.id,
        chat_id: chat.id,
        user_id: p.user.id,
        joined_at: '',
        user: p.user,
      });
    });

    const chatIds = Array.from(chatMap.keys());
    if (chatIds.length === 0) {
      setChats([]);
      setLoadingChats(false);
      return;
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false });

    const { data: unread } = await supabase
      .from('messages')
      .select('chat_id')
      .in('chat_id', chatIds)
      .neq('sender_id', currentUser.id)
      .eq('is_read', false);

    const unreadMap = new Map<string, number>();
    unread?.forEach((m: { chat_id: string }) => {
      unreadMap.set(m.chat_id, (unreadMap.get(m.chat_id) || 0) + 1);
    });

    const lastMsgMap = new Map<string, any>();
    messages?.forEach((m: any) => {
      if (!lastMsgMap.has(m.chat_id)) {
        lastMsgMap.set(m.chat_id, m);
      }
    });

    chatIds.forEach((chatId) => {
      const entry = chatMap.get(chatId)!;
      entry.last_message = lastMsgMap.get(chatId) || null;
      entry.unread_count = unreadMap.get(chatId) || 0;
    });

    const sortedChats = Array.from(chatMap.values()).sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setChats(sortedChats);
    setLoadingChats(false);
  }, [currentUser]);

  useEffect(() => {
    if (!checkingAuth && currentUser) {
      fetchChats();
    }
  }, [checkingAuth, currentUser, fetchChats]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('chat-list-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchChats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_participants' },
        () => fetchChats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => fetchChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchChats]);

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    if (isMobile) setMobileView('chat');
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unread_count: 0 } : c))
    );
  };

  const handleBack = () => {
    setMobileView('sidebar');
    setActiveChatId(null);
  };

  const handleChatLeft = () => {
    setActiveChatId(null);
    setMobileView('sidebar');
    fetchChats();
  };

  const handleGroupCreated = (chatId: string) => {
    fetchChats().then(() => {
      setActiveChatId(chatId);
      if (isMobile) setMobileView('chat');
    });
  };

  const handleChatStarted = (chatId: string) => {
    fetchChats().then(() => {
      setActiveChatId(chatId);
      if (isMobile) setMobileView('chat');
    });
  };

  const handleStatusUpdated = (newStatus: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, status_message: newStatus || null };
    setCurrentUser(updated);
    const session = getSession();
    if (session) {
      const refreshed = { ...session, status_message: newStatus || null };
      localStorage.setItem('chat_session', JSON.stringify(refreshed));
    }
  };

  if (checkingAuth || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <div
        className={cn(
          'h-full w-full md:w-80 lg:w-96 shrink-0 border-r border-neutral-800',
          isMobile && mobileView === 'chat' ? 'hidden' : 'block'
        )}
      >
        <Sidebar
          currentUser={currentUser}
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onLogout={handleLogout}
          onCreateGroup={() => setShowCreateGroup(true)}
          onStartDM={() => setShowStartDM(true)}
          onEditStatus={() => setShowEditStatus(true)}
          loading={loadingChats}
          isMobile={isMobile}
          onBack={handleBack}
        />
      </div>

      <div
        className={cn(
          'h-full flex-1',
          isMobile && mobileView === 'sidebar' ? 'hidden' : 'block'
        )}
      >
        {activeChat ? (
          <ChatWindow
            key={activeChat.id}
            chat={activeChat}
            currentUser={currentUser}
            onBack={handleBack}
            onChatLeft={handleChatLeft}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900">
              <MessageSquare className="h-8 w-8 text-neutral-600" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Select a conversation
            </h2>
            <p className="mt-1 max-w-xs text-sm text-neutral-500">
              Choose a chat from the sidebar or start a new conversation to begin messaging
            </p>
          </div>
        )}
      </div>

      <CreateGroupModal
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        currentUser={currentUser}
        onGroupCreated={handleGroupCreated}
      />

      <StartDMModal
        open={showStartDM}
        onOpenChange={setShowStartDM}
        currentUser={currentUser}
        onChatStarted={handleChatStarted}
      />

      <EditStatusModal
        open={showEditStatus}
        onOpenChange={setShowEditStatus}
        currentUser={currentUser}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
