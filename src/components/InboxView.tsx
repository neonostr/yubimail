import { useState, useEffect, useCallback } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { getMessages, getMessage, deleteMessage, markAsRead } from '@/lib/mailtm';
import type { Email } from '@/types/vault';
import { RefreshCw, Trash2, Mail, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { formatDistanceToNow } from 'date-fns';

export default function InboxView() {
  const { getSelectedAccount, selectedAccountId } = useVault();
  const account = getSelectedAccount();

  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEmails = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const msgs = await getMessages(account.token);
      setEmails(msgs);
    } catch (err: any) {
      toast.error('Failed to fetch emails: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 30000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  useEffect(() => {
    setSelectedEmail(null);
  }, [selectedAccountId]);

  const handleSelectEmail = async (email: Email) => {
    if (!account) return;
    try {
      const full = await getMessage(email.id, account.token);
      if (!email.seen) {
        await markAsRead(email.id, account.token).catch(() => {});
      }
      setSelectedEmail(full);
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, seen: true } : e))
      );
    } catch (err: any) {
      toast.error('Failed to load email');
    }
  };

  const handleDeleteEmail = async (emailId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!account) return;
    try {
      await deleteMessage(emailId, account.token);
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (selectedEmail?.id === emailId) setSelectedEmail(null);
      toast.success('Email deleted');
    } catch {
      toast.error('Failed to delete email');
    }
  };

  if (!account) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-3">
          <Mail className="w-12 h-12 mx-auto opacity-30" />
          <p className="text-lg">Select an address to view inbox</p>
          <p className="text-sm">Or create a new disposable address</p>
        </div>
      </div>
    );
  }

  // Email detail view
  if (selectedEmail) {
    const htmlContent = selectedEmail.html?.join('') || '';
    const sanitized = htmlContent
      ? DOMPurify.sanitize(htmlContent, { ADD_ATTR: ['target'] })
      : null;

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedEmail(null)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate text-foreground">
              {selectedEmail.subject || '(No Subject)'}
            </h2>
            <p className="text-xs text-muted-foreground">
              From: {selectedEmail.from.name || selectedEmail.from.address}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteEmail(selectedEmail.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <div className="mb-4 space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">
                {selectedEmail.from.name || selectedEmail.from.address}
              </span>
              {selectedEmail.from.name && (
                <span className="ml-2 font-mono text-xs">&lt;{selectedEmail.from.address}&gt;</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(selectedEmail.createdAt).toLocaleString()}
            </p>
          </div>
          {sanitized ? (
            <div
              className="prose prose-invert prose-sm max-w-none
                [&_a]:text-primary [&_a]:underline
                [&_img]:max-w-full [&_img]:h-auto
                [&_table]:border-border [&_td]:border-border [&_th]:border-border"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
          ) : (
            <pre className="text-sm whitespace-pre-wrap text-foreground font-sans leading-relaxed">
              {selectedEmail.text || selectedEmail.intro || 'No content'}
            </pre>
          )}
        </div>
      </div>
    );
  }

  // Email list view
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Inbox</h2>
          <p className="text-xs font-mono text-muted-foreground">{account.address}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchEmails}
          disabled={loading}
          className={cn(loading && 'animate-spin')}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {emails.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No emails yet</p>
            <p className="text-xs mt-1">
              {loading ? 'Checking...' : 'Emails will appear here automatically'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {emails.map((email) => (
              <button
                key={email.id}
                onClick={() => handleSelectEmail(email)}
                className={cn(
                  'w-full text-left p-4 hover:bg-muted/50 transition-colors group',
                  !email.seen && 'bg-accent/30'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!email.seen && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                      <span className="font-medium text-sm truncate text-foreground">
                        {email.from.name || email.from.address}
                      </span>
                    </div>
                    <p className="text-sm truncate mt-0.5 text-foreground">
                      {email.subject || '(No Subject)'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {email.intro}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}
                    </span>
                    <button
                      onClick={(e) => handleDeleteEmail(email.id, e)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
