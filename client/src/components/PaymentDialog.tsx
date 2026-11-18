import { CreditCard, ShieldCheck } from 'lucide-react';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';

interface Props {
  open: boolean;
  classTitle: string;
  amount: number;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirms a MOCK payment before joining a paid class. There is no real payment gateway behind
 * this — see server/src/models/Payment.js — so the copy says so plainly rather than looking like a
 * real charge.
 */
export function PaymentDialog({ open, classTitle, amount, loading, onConfirm, onCancel }: Props) {
  return (
    <Dialog
      open={open}
      onClose={() => !loading && onCancel()}
      title="Pay to join this class"
      description={
        <>
          “{classTitle}” costs <strong className="font-semibold text-slate-900">₹{amount}</strong>.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button icon={CreditCard} loading={loading} onClick={onConfirm}>
            Pay ₹{amount} &amp; join
          </Button>
        </>
      }
    >
      <Alert variant="info">
        <span className="flex items-start gap-2">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden />
          This is a demo payment for this project. No real payment gateway is connected and no money moves — clicking “Pay” just records a receipt.
        </span>
      </Alert>
    </Dialog>
  );
}
