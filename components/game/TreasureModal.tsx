import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  amount: number;
  onClose: () => void;
};

export default function TreasureModal({ open, amount, onClose }: Props) {
  return (
    <Dialog open={open}>
      <DialogContent onEscapeKeyDown={onClose} onPointerDownOutside={onClose}>
        <DialogHeader>
          <DialogTitle>🏴‍☠️ Legendary Treasure Found!</DialogTitle>
          <DialogDescription>You unearthed {amount} gold from a hidden hoard.</DialogDescription>
        </DialogHeader>
        <div className="mt-3 text-right">
          <button className="px-3 py-2 rounded-lg bg-amber-500 text-black" onClick={onClose}>Sail on</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
