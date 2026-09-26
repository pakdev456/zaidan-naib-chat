'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Check, UserPlus } from 'lucide-react';
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
import type { User, ChatParticipant } from '@/lib/types';

interface AddMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  existingParticipants: ChatParticipant[];
  onMembersAdded: () => void;
}

export function AddMembersModal({
  open,
  onOpenChange,
  chatId,
  existingParticipants,
  onMembersAdded,
}: AddMembersModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSelected(new Set());
      setSearch('');
      setError('');
    }
  }, [open]);

  const fetchUsers = async () => {
    const existingIds = existingParticipants.map(p => p.user_id);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .not('id', 'in', `(${existingIds.join(',')})`)
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

  const handleAdd = async () => {
    if (selected.size === 0) {
      setError('Select at least one member');
      return;
    }
    setError('');
    setLoading(true);

    const inserts = Array.from(selected).map((userId) => ({
      chat_id: chatId,
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
    onMembersAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-neutral-950 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                  No more users to add
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
            onClick={handleAdd}
            disabled={loading || selected.size === 0}
            className="bg-white text-black hover:bg-neutral-200"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Members
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
