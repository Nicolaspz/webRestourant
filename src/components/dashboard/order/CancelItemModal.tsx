'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';

interface CancelItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isLoading: boolean;
    itemName: string;
}

export function CancelItemModal({ isOpen, onClose, onConfirm, isLoading, itemName }: CancelItemModalProps) {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        if (reason.trim().length < 3) return;
        onConfirm(reason);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isLoading) onClose();
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-red-600">Cancelar Item</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja cancelar <strong>{itemName}</strong>? Esta ação exigirá um estorno no stock.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason" className="text-red-600 font-semibold mb-2 block">
                            Motivo do Cancelamento *
                        </Label>
                        <Input
                            id="reason"
                            placeholder="Ex: Cliente desistiu, produto em falta..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="border-red-200 focus-visible:ring-red-500"
                            autoFocus
                        />
                        {reason.trim().length > 0 && reason.trim().length < 3 && (
                            <p className="text-xs text-red-500">Mínimo de 3 caracteres obrigatório.</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Voltar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isLoading || reason.trim().length < 3}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Cancelamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
