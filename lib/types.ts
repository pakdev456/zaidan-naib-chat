export interface User {
  id: string;
  username: string;
  status_message: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  joined_at: string;
  user?: User;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  is_pinned?: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  sender?: { id: string; username: string; status_message?: string | null; is_admin?: boolean; created_at?: string };
}

export interface Presence {
  id: string;
  user_id: string;
  chat_id: string | null;
  is_online: boolean;
  last_seen: string;
}

export interface ChatWithDetails extends Chat {
  participants?: ChatParticipant[];
  last_message?: Message | null;
  unread_count?: number;
}

export interface SessionUser {
  id: string;
  username: string;
  status_message: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  is_admin: boolean;
}
