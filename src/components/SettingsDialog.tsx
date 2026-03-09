import { useState } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { registerCredential } from '@/lib/webauthn';
import { clearVault } from '@/lib/vault';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Key, Trash2, Plus, AlertTriangle, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: Props) {
  const { vault, updateVault, lock } = useVault();
  const [addingKey, setAddingKey] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');

  const handleAddKey = async () => {
    setAddingKey(true);
    try {
      const { credentialId, rawId } = await registerCredential();
      const { arrayBufferToBase64 } = await import('@/lib/crypto');
      await updateVault((v) => ({
        ...v,
        registeredKeys: [
          ...v.registeredKeys,
          {
            credentialId,
            publicKey: arrayBufferToBase64(rawId),
            registeredAt: Date.now(),
            label: newKeyLabel || `Key ${v.registeredKeys.length + 1}`,
          },
        ],
      }));
      toast.success('YubiKey registered');
      setNewKeyLabel('');
    } catch (err: any) {
      toast.error('Failed to register key: ' + (err.message || ''));
    } finally {
      setAddingKey(false);
    }
  };

  const handleRemoveKey = async (credentialId: string) => {
    if (!vault || vault.registeredKeys.length <= 1) {
      toast.error('Cannot remove the last key');
      return;
    }
    await updateVault((v) => ({
      ...v,
      registeredKeys: v.registeredKeys.filter((k) => k.credentialId !== credentialId),
    }));
    toast.success('Key removed');
  };

  const handleClearAll = () => {
    if (window.confirm('This will permanently delete ALL data including encrypted vault. This cannot be undone. Continue?')) {
      clearVault();
      lock();
      toast.success('All data cleared');
    }
  };

  const handleExport = () => {
    const data = localStorage.getItem('yubimail-vault');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yubimail-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Vault backup exported');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        JSON.parse(text); // validate JSON
        localStorage.setItem('yubimail-vault', text);
        lock();
        toast.success('Vault imported. Please unlock with your YubiKey.');
      } catch {
        toast.error('Invalid backup file');
      }
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your YubiKeys and vault</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Registered Keys */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Key className="w-4 h-4" />
              Registered YubiKeys
            </h3>
            <div className="space-y-2">
              {vault?.registeredKeys.map((key) => (
                <div
                  key={key.credentialId}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{key.label || 'Unnamed Key'}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {key.credentialId.slice(0, 16)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Registered {new Date(key.registeredAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveKey(key.credentialId)}
                    disabled={(vault?.registeredKeys.length || 0) <= 1}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={newKeyLabel}
                onChange={(e) => setNewKeyLabel(e.target.value)}
                placeholder="Key label (optional)"
                className="text-sm"
              />
              <Button onClick={handleAddKey} disabled={addingKey} variant="outline" size="sm" className="shrink-0 gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add Key
              </Button>
            </div>
          </div>

          <Separator />

          {/* Backup */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Vault Backup</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Download className="w-3.5 h-3.5" />
                Export Backup
              </Button>
              <Button variant="outline" size="sm" onClick={handleImport} className="gap-2">
                <Upload className="w-3.5 h-3.5" />
                Import Backup
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Backups are encrypted. You'll need a registered YubiKey to unlock.
            </p>
          </div>

          <Separator />

          {/* Danger zone */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </h3>
            <Button variant="destructive" size="sm" onClick={handleClearAll} className="gap-2">
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
