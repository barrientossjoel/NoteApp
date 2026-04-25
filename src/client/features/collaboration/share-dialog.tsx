import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Share2 } from 'lucide-react';

interface ShareDialogProps {
    elementId: string;
    elementType: 'document' | 'canvas';
}

export function ShareDialog({ elementId, elementType }: ShareDialogProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState('view');

    const handleShare = () => {
        if (!email) return;
        // In a real implementation this would make an API call to share the document
        console.log(`Sharing ${elementType} ${elementId} with ${email} as ${permission}`);
        setEmail('');
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 shrink-0 hidden sm:flex">
                    <Share2 className="h-4 w-4" />
                    {t('share')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('share')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">{t('documentSharesDesc')}</p>
                    <div className="flex gap-2">
                        <Input
                            placeholder={t('emailPlaceholder') as string}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="flex-1"
                        />
                        <Select value={permission} onValueChange={setPermission}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="view">{t('permissionView')}</SelectItem>
                                <SelectItem value="edit">{t('permissionEdit')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleShare} className="w-full">{t('share')}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
