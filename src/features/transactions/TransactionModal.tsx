import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter, // If needed for separate actions
} from "../../components/ui/dialog";
import TransactionForm from './TransactionForm';
import type { Transaction, Envelope } from 'wasp/entities';

// Type definition for clarity, matching TransactionForm
type TransactionWithEnvelope = Transaction & { envelope: Envelope };

interface TransactionModalProps {
  trigger: React.ReactNode;
  transactionToEdit?: TransactionWithEnvelope | Partial<Transaction>;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmitSuccess?: (transaction: Transaction) => void;
}

export function TransactionModal({
  trigger,
  transactionToEdit,
  isOpen,
  setIsOpen,
  onSubmitSuccess,
}: TransactionModalProps) {

  const handleSuccess = (transaction: Transaction) => {
    onSubmitSuccess?.(transaction);
    setIsOpen(false); // Close modal on success
  };

  const handleCancel = () => {
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {transactionToEdit?.id ? 'Edit Transaction' : 'Add New Transaction'}
          </DialogTitle>
          <DialogDescription>
            {transactionToEdit?.id
              ? 'Update the details of your transaction.'
              : 'Enter the details for your new transaction.'}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          transactionToEdit={transactionToEdit}
          onSubmitSuccess={handleSuccess}
          onCancel={handleCancel}
        />
        {/* DialogFooter can be used if actions are outside the form,
            but TransactionForm includes its own submit/cancel buttons. */}
        {/* <DialogFooter>
          <Button type="submit" form="transaction-form-id">Save changes</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}

export default TransactionModal; 