'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { SessionUser } from '@/lib/types';

interface EditStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: SessionUser;
  onStatusUpdated: (newStatus: string) => void;
}

export function EditStatusModal({
  open,
  onOpenChange,
  currentUser,
  onStatusUpdated,
}: EditStatusModalProps) {
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(currentUser.status_message || '');
    }
  }, [open, currentUser]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ status_message: status.trim() || null })
      .eq('id', currentUser.id);

    if (!error) {
      onStatusUpdated(status.trim());
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-neutral-950 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="status" className="text-neutral-300">
            Status Message
          </Label>
          <Input
            id="status"
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="e.g. Available, Busy, At work..."
            className="border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 focus:border-neutral-600"
            maxLength={100}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <p className="text-xs text-neutral-500">{status.length}/100</p>
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
            onClick={handleSave}
            disabled={saving}
            className="bg-white text-black hover:bg-neutral-200"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
