import React, { useState } from 'react';
import { useQuery } from 'wasp/client/operations';
import { getTransactions } from 'wasp/client/operations';
import type { Transaction, Envelope } from 'wasp/entities';
import { TransactionType } from '@prisma/client';
import { format } from 'date-fns';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { cn } from "../../lib/cn";

// Import Layout components
import { Header } from '../../components/layout/header';
import { Main } from '../../components/layout/main';
import { Search } from '../../components/search';
import { ThemeSwitch } from '../../components/theme-switch';
import { ProfileDropdown } from '../../components/profile-dropdown';

import TransactionModal from './TransactionModal';
import DeleteTransactionDialog from './DeleteTransactionDialog';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

// Type definition for clarity, matching operations.ts
type TransactionWithEnvelope = Transaction & { envelope: Envelope };

const TransactionsPage = () => {
  const { data: transactions, isLoading, error } = useQuery(getTransactions);

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionWithEnvelope | Partial<Transaction> | undefined>(undefined);

  const handleAddTransaction = () => {
    setTransactionToEdit(undefined); // Still need to ensure we clear any potential edit state
  };

  const handleEditTransaction = (transaction: TransactionWithEnvelope) => {
    setTransactionToEdit(transaction);
    setIsAddEditModalOpen(true);
  };

  const handleModalSubmitSuccess = () => {
    // Optional: Could trigger a refetch if useQuery doesn't auto-update
    // queryClient.invalidateQueries(getTransactions.queryKey)
    setIsAddEditModalOpen(false); // Close modal handled inside TransactionModal now
    setTransactionToEdit(undefined);
  };

  const handleModalCancel = () => {
     setIsAddEditModalOpen(false);
     setTransactionToEdit(undefined);
  }

  const handleDeleteSuccess = () => {
    // Optional: Could trigger a refetch if useQuery doesn't auto-update
    // queryClient.invalidateQueries(getTransactions.queryKey)
    console.log("Transaction deleted successfully");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (isLoading) return <div>Loading transactions...</div>;
  if (error) return <div>Error loading transactions: {error.message}</div>;

  return (
    <>
       {/* Add Header like in Tasks page */}
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* Wrap existing content in Main */}
      <Main className="p-4 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <TransactionModal
            isOpen={isAddEditModalOpen}
            setIsOpen={setIsAddEditModalOpen}
            transactionToEdit={transactionToEdit}
            onSubmitSuccess={handleModalSubmitSuccess}
            trigger={
              <Button onClick={handleAddTransaction}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            }
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Envelope</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions && transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.date), 'P')}</TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>{tx.envelope.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={tx.type === TransactionType.EXPENSE ? 'destructive' : 'default'}
                          className={cn(
                            tx.type === TransactionType.INCOME &&
                              'border-transparent bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-800/80 dark:text-green-50'
                            // Destructive variant handles its own styling for EXPENSE
                          )}
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                         {/* Edit Button - Triggers the same modal but passes transaction data */}
                        <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(tx)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {/* Delete Button - Triggers the confirmation dialog */}
                        <DeleteTransactionDialog
                          transaction={tx}
                          onDeleteSuccess={handleDeleteSuccess}
                          trigger={
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                         />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No transactions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
         {/* The Add/Edit Modal is controlled by state and triggered by buttons */}
         {/* The Delete Dialog is self-contained within each row's trigger */}
      </Main>
    </>
  );
};

export default TransactionsPage; 