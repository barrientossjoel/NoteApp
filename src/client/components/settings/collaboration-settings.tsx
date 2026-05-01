import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Share2, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { getVaultShares, createVaultShare, deleteVaultShare } from '../../actions/actions';

export function CollaborationSettings() {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState('view');
    const [shares, setShares] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        fetchShares();
    }, []);

    const fetchShares = async () => {
        try {
            const data = await getVaultShares();
            setShares(data);
        } catch (error) {
            console.error('Error fetching vault shares:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!email) return;
        setSharing(true);
        try {
            await createVaultShare({ email, permission: permission as 'view' | 'edit' });
            setEmail('');
            fetchShares();
        } catch (error) {
            console.error('Error sharing vault:', error);
        } finally {
            setSharing(false);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await deleteVaultShare(id);
            fetchShares();
        } catch (error) {
            console.error('Error removing vault share:', error);
        }
    };

    return (
        <div className="space-y-[clamp(1.5rem,4vw,2.5rem)] animate-in fade-in duration-300">
            <div>
                <h3 className="text-[clamp(1.125rem,2.5vw,1.25rem)] font-medium text-foreground mb-[clamp(0.5rem,1.5vw,0.75rem)] flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-muted-foreground" />
                    {t('collaboration')}
                </h3>
                <p className="text-[clamp(12px,1.5vw,14px)] text-muted-foreground mb-[clamp(1rem,3vw,1.5rem)]">
                    {t('vaultSharesDesc')}
                </p>

                {/* Add Share Form */}
                <div className="flex items-center gap-2 mb-[clamp(1rem,3vw,1.5rem)]">
                    <Input
                        placeholder={t('emailPlaceholder') as string}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1"
                        type="email"
                    />
                    <Select value={permission} onValueChange={setPermission}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="view">{t('permissionView')}</SelectItem>
                            <SelectItem value="edit">{t('permissionEdit')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleShare} disabled={sharing || !email}>
                        {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : t('shareVault')}
                    </Button>
                </div>

                {/* List Shares */}
                <div className="space-y-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : shares.length === 0 ? (
                        <div className="text-center p-6 border rounded-lg bg-card text-muted-foreground text-sm">
                            {t('noResultsFound')}
                        </div>
                    ) : (
                        shares.map(share => (
                            <div key={share.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>{share.sharedWithEmail.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{share.sharedWithEmail}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                                        {share.permission === 'edit' ? t('permissionEdit') : t('permissionView')}
                                    </span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(share.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
