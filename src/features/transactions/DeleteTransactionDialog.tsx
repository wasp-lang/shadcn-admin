import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { Button } from "../../components/ui/button";
import { deleteTransaction } from 'wasp/client/operations';
import type { Transaction } from 'wasp/entities';

interface DeleteTransactionDialogProps {
  transaction: Transaction;
  trigger: React.ReactNode;
  onDeleteSuccess?: (deletedTransaction: Transaction) => void;
}

export function DeleteTransactionDialog({
  transaction,
  trigger,
  onDeleteSuccess,
}: DeleteTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const deleted = await deleteTransaction({ id: transaction.id });
      onDeleteSuccess?.(deleted);
      setIsOpen(false); // Close on success
    } catch (err: any) {
      console.error("Error deleting transaction:", err);
      setError(err.message || "Failed to delete transaction.");
      // Keep dialog open to show error
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            transaction described as "{transaction.description}" dated{" "}
            {new Date(transaction.date).toLocaleDateString()}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="text-red-500 text-sm mt-2">Error: {error}</div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteTransactionDialog; 