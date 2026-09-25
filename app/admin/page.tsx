'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Shield,
  LogOut,
  UserPlus,
  Trash2,
  Search,
  Crown,
  Check,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSession, clearSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const checkAuth = useCallback(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!session.is_admin) {
      router.replace('/');
      return;
    }
    setCurrentUserId(session.id);
    setCheckingAuth(false);
  }, [router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setUsers(data as User[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!checkingAuth) {
      fetchUsers();
    }
  }, [checkingAuth, fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setCreateMsg('Username and password are required');
      return;
    }
    setCreating(true);
    setCreateMsg('');

    const { data, error } = await supabase.rpc('create_user', {
      p_username: newUsername.trim(),
      p_password: newPassword,
      p_is_admin: newIsAdmin,
    });

    if (error) {
      setCreateMsg(error.message.includes('duplicate') || error.message.includes('unique')
        ? 'Username already exists'
        : 'Failed to create user');
      setCreating(false);
      return;
    }
    if (data && data.length > 0) {
      setCreateMsg(`User "${data[0].username}" created successfully`);
      setNewUsername('');
      setNewPassword('');
      setNewIsAdmin(false);
      fetchUsers();
    }
    setCreating(false);
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (userId === currentUserId) return;
    if (!confirm(`Delete user "${username}"? This will remove them from all chats.`)) return;

    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) {
      setCreateMsg('Failed to delete user');
      return;
    }
    fetchUsers();
  };

  const handleToggleAdmin = async (userId: string, currentAdmin: boolean) => {
    if (userId === currentUserId) return;
    const { error } = await supabase
      .from('users')
      .update({ is_admin: !currentAdmin })
      .eq('id', userId);
    if (error) {
      setCreateMsg('Failed to update user');
      return;
    }
    fetchUsers();
  };

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-black/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Admin Panel</h1>
              <p className="text-xs text-neutral-500">Manage users and access</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-neutral-800 bg-transparent text-neutral-300 hover:bg-neutral-900 hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-white" />
            <h2 className="text-base font-semibold">Create New User</h2>
          </div>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-username" className="text-neutral-300">
                  Username
                </Label>
                <Input
                  id="new-username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                  className="border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 focus:border-neutral-600"
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-neutral-300">
                  Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password"
                  className="border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 focus:border-neutral-600"
                  disabled={creating}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={newIsAdmin}
                  onCheckedChange={setNewIsAdmin}
                />
                <Label className="text-neutral-300 cursor-pointer">
                  Grant admin privileges
                </Label>
              </div>
              <Button
                type="submit"
                disabled={creating}
                className="bg-white text-black hover:bg-neutral-200"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </div>
            {createMsg && (
              <p
                className={`text-sm animate-fade-in ${
                  createMsg.includes('successfully')
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {createMsg}
              </p>
            )}
          </form>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">User Directory</h2>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="pl-9 border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 focus:border-neutral-600"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500">
              No users found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800 hover:bg-transparent">
                    <TableHead className="text-neutral-400">Username</TableHead>
                    <TableHead className="text-neutral-400">Status</TableHead>
                    <TableHead className="text-neutral-400">Role</TableHead>
                    <TableHead className="text-neutral-400">Created</TableHead>
                    <TableHead className="text-neutral-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="border-neutral-800/50 hover:bg-neutral-900/50"
                    >
                      <TableCell className="font-medium text-white">
                        {user.username}
                        {user.id === currentUserId && (
                          <span className="ml-2 text-xs text-neutral-500">(you)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-neutral-400 text-sm">
                        {user.status_message || '—'}
                      </TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-white">
                            <Crown className="h-3 w-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500">User</span>
                        )}
                      </TableCell>
                      <TableCell className="text-neutral-500 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                            onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                            disabled={user.id === currentUserId}
                            title={user.id === currentUserId ? "Can't change your own role" : 'Toggle admin'}
                          >
                            {user.is_admin ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-red-400 hover:bg-red-950 hover:text-red-300"
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            disabled={user.id === currentUserId}
                            title={user.id === currentUserId ? "Can't delete yourself" : 'Delete user'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
