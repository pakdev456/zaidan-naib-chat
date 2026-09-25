'use client';

import { useEffect, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase/client';
import type { SessionUser } from '@/lib/types';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: SessionUser;
  onProfileUpdated: (profile: Partial<SessionUser>) => void;
}

export function EditProfileModal({
  open,
  onOpenChange,
  currentUser,
  onProfileUpdated,
}: EditProfileModalProps) {
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setBio(currentUser.bio || '');
    setStatus(currentUser.status_message || '');
    setPreviewUrl(currentUser.avatar_url || '');
    setAvatarFile(null);
    setError('');
  }, [open, currentUser]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Foto terlalu besar. Maksimal 5 MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar.');
      return;
    }
    setError('');
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    let avatarUrl = currentUser.avatar_url || null;

    if (avatarFile) {
      const extension = avatarFile.name.split('.').pop() || 'jpg';
      const path = `${currentUser.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
      if (uploadError) {
        setError('Foto profil gagal diunggah.');
        setSaving(false);
        return;
      }
      avatarUrl = supabase.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl;
    }

    const profile = {
      bio: bio.trim() || null,
      status_message: status.trim() || null,
      avatar_url: avatarUrl,
    };
    const { error: updateError } = await supabase
      .from('users')
      .update(profile)
      .eq('id', currentUser.id);

    if (updateError) {
      setError('Profil gagal disimpan.');
      setSaving(false);
      return;
    }

    onProfileUpdated(profile);
    onOpenChange(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-neutral-950 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Pengaturan Akun</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-neutral-700 bg-neutral-900">
              <AvatarImage src={previewUrl} alt={currentUser.username} />
              <AvatarFallback className="bg-neutral-900 text-white">{currentUser.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <label htmlFor="profile-avatar" className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-800 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-900">
                <Camera className="h-4 w-4" /> Ganti foto
              </label>
              <input id="profile-avatar" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <p className="mt-1 text-xs text-neutral-600">JPG, PNG maksimal 5 MB</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-bio" className="text-neutral-300">Deskripsi</Label>
            <Input id="profile-bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={120} placeholder="Ceritakan sedikit tentang kamu" className="border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600" />
            <p className="text-xs text-neutral-600">{bio.length}/120</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-status" className="text-neutral-300">Status</Label>
            <Input id="profile-status" value={status} onChange={(event) => setStatus(event.target.value)} maxLength={100} placeholder="Available, Busy, Away..." className="border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-neutral-800 bg-transparent text-neutral-300 hover:bg-neutral-900 hover:text-white">Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-white text-black hover:bg-neutral-200">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
