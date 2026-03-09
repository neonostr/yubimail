import { useState, useEffect } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { getDomains, createAccount, getToken, generateRandomAddress, generatePassword } from '@/lib/mailtm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import type { MailDomain } from '@/types/vault';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateAddressDialog({ open, onOpenChange }: Props) {
  const { updateVault } = useVault();
  const [domains, setDomains] = useState<MailDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [username, setUsername] = useState('');
  const [tag, setTag] = useState('');
  const [autoDelete, setAutoDelete] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);

  useEffect(() => {
    if (open) {
      loadDomains();
      setTag('');
      setAutoDelete('none');
    }
  }, [open]);

  const loadDomains = async () => {
    setLoadingDomains(true);
    try {
      const d = await getDomains();
      const active = d.filter((dom) => dom.isActive && !dom.isPrivate);
      setDomains(active);
      if (active.length > 0) {
        setSelectedDomain(active[0].domain);
        setUsername(generateRandomAddress(active[0].domain).split('@')[0]);
      }
    } catch (err: any) {
      toast.error('Failed to load domains: ' + (err.message || ''));
    } finally {
      setLoadingDomains(false);
    }
  };

  const randomize = () => {
    if (selectedDomain) {
      setUsername(generateRandomAddress(selectedDomain).split('@')[0]);
    }
  };

  const handleCreate = async () => {
    if (!username || !selectedDomain) return;
    setLoading(true);
    try {
      const address = `${username}@${selectedDomain}`;
      const password = generatePassword();
      const result = await createAccount(address, password);
      const token = await getToken(address, password);

      let autoDeleteAt: number | undefined;
      let autoDeleteDuration: '1h' | '24h' | '7d' | undefined;
      if (autoDelete === '1h') {
        autoDeleteAt = Date.now() + 3600000;
        autoDeleteDuration = '1h';
      } else if (autoDelete === '24h') {
        autoDeleteAt = Date.now() + 86400000;
        autoDeleteDuration = '24h';
      } else if (autoDelete === '7d') {
        autoDeleteAt = Date.now() + 604800000;
        autoDeleteDuration = '7d';
      }

      await updateVault((v) => ({
        ...v,
        accounts: [
          ...v.accounts,
          {
            id: result.id,
            address: result.address,
            password,
            token,
            createdAt: Date.now(),
            tag: tag || undefined,
            autoDeleteAt,
            autoDeleteDuration,
          },
        ],
      }));

      toast.success(`Created ${address}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to create address: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Disposable Address</DialogTitle>
          <DialogDescription>
            Generate a new disposable email address via mail.tm
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Address */}
          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-1">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  placeholder="username"
                  className="font-mono text-sm"
                />
                <span className="text-muted-foreground text-sm shrink-0">@</span>
                {domains.length > 1 ? (
                  <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                    <SelectTrigger className="w-40 font-mono text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((d) => (
                        <SelectItem key={d.id} value={d.domain} className="font-mono text-sm">
                          {d.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="font-mono text-sm text-muted-foreground">{selectedDomain || '...'}</span>
                )}
              </div>
              <Button variant="outline" size="icon" onClick={randomize} title="Randomize">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tag */}
          <div className="space-y-2">
            <Label>Service Tag (optional)</Label>
            <Input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g., Netflix trial, Forum signup"
              className="text-sm"
            />
          </div>

          {/* Auto-delete */}
          <div className="space-y-2">
            <Label>Auto-Delete Timer</Label>
            <Select value={autoDelete} onValueChange={setAutoDelete}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No auto-delete</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !username || !selectedDomain}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
