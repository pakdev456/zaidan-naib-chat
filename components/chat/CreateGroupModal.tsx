'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase/client';
import type { User, SessionUser } from '@/lib/types';

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: SessionUser;
  onGroupCreated: (chatId: string) => void;
}

export function CreateGroupModal({
  open,
  onOpenChange,
  currentUser,
  onGroupCreated,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchUsers();
      setGroupName('');
      setSelected(new Set());
      setSearch('');
      setError('');
    }
  }, [open]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .neq('id', currentUser.id)
      .order('username', { ascending: true });
    if (!error && data) {
      setUsers(data as User[]);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    if (selected.size === 0) {
      setError('Select at least one member');
      return;
    }
    setError('');
    setLoading(true);

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        name: groupName.trim(),
        is_group: true,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (chatError || !chat) {
      setError('Failed to create group');
      setLoading(false);
      return;
    }

    const participantIds = [currentUser.id, ...Array.from(selected)];
    const inserts = participantIds.map((userId) => ({
      chat_id: chat.id,
      user_id: userId,
    }));

    const { error: pError } = await supabase
      .from('chat_participants')
      .insert(inserts);

    if (pError) {
      setError('Failed to add members');
      setLoading(false);
      return;
    }

    setLoading(false);
    onOpenChange(false);
    onGroupCreated(chat.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-neutral-950 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Group Name</label>
            <Input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 focus:border-neutral-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              Select Members ({selected.size})
            </label>
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
          </div>

          <ScrollArea className="h-48 rounded-lg border border-neutral-800">
            <div className="space-y-1 p-2">
              {filteredUsers.length === 0 ? (
                <p className="py-4 text-center text-sm text-neutral-500">
                  No users available
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-900"
                  >
                    <Checkbox
                      checked={selected.has(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                      className="border-neutral-600 data-[state=checked]:bg-white data-[state=checked]:text-black"
                    />
                    <span className="text-sm text-white">{user.username}</span>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>

          {error && <p className="text-sm text-red-400 animate-fade-in">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-neutral-800 bg-transparent text-neutral-300 hover:bg-neutral-900 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="bg-white text-black hover:bg-neutral-200"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Create Group
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
