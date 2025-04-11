import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { cn } from '../../lib/cn'; // Changed to relative path
import { Button } from '../../components/ui/button'; // Changed to relative path
import { Calendar } from '../../components/ui/calendar'; // Changed to relative path
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form'; // Changed to relative path
import { Input } from '../../components/ui/input'; // Changed to relative path
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover'; // Changed to relative path
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'; // Changed to relative path
import { useQuery, createTransaction, updateTransaction } from 'wasp/client/operations';
import { getEnvelopes } from 'wasp/client/operations'; // Ensure getEnvelopes is imported
import type { Transaction, Envelope } from 'wasp/entities';
import { TransactionType } from '@prisma/client'; // Import enum values

// Schema for form validation using Zod
const formSchema = z.object({
  date: z.date({
    required_error: 'A date is required.',
  }),
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'), // Coerce to number, ensure positive
  type: z.nativeEnum(TransactionType),
  envelopeId: z.string().min(1, 'Please select an envelope.'),
});

type TransactionFormData = z.infer<typeof formSchema>;

// Define the type for the transaction prop more accurately
type TransactionWithEnvelope = Transaction & { envelope: Envelope };

interface TransactionFormProps {
  transactionToEdit?: TransactionWithEnvelope | Partial<Transaction>; // Allow partial for initial create state
  onSubmitSuccess?: (transaction: Transaction) => void;
  onCancel?: () => void;
}

export function TransactionForm({
  transactionToEdit,
  onSubmitSuccess,
  onCancel,
}: TransactionFormProps) {
  const { data: envelopes, isLoading: isLoadingEnvelopes } = useQuery(getEnvelopes);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: transactionToEdit?.date ? new Date(transactionToEdit.date) : new Date(),
      description: transactionToEdit?.description || '',
      amount: transactionToEdit?.amount || 0,
      type: transactionToEdit?.type || TransactionType.EXPENSE, // Default to Expense
      envelopeId: transactionToEdit?.envelopeId || '',
    },
  });

  const { isSubmitting } = form.formState;

  // Reset form when transactionToEdit changes (e.g., opening modal)
  useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        date: transactionToEdit.date ? new Date(transactionToEdit.date) : new Date(),
        description: transactionToEdit.description || '',
        amount: transactionToEdit.amount || 0,
        type: transactionToEdit.type || TransactionType.EXPENSE,
        envelopeId: transactionToEdit.envelopeId || '',
      });
    } else {
       // Reset for creating a new transaction
       form.reset({
        date: new Date(),
        description: '',
        amount: 0,
        type: TransactionType.EXPENSE,
        envelopeId: '',
      });
    }
  }, [transactionToEdit, form.reset]); // form.reset dependency needs confirmation if stable


  async function onSubmit(values: TransactionFormData) {
    try {
      let result: Transaction;
      if (transactionToEdit?.id) {
        // Update existing transaction
        result = await updateTransaction({ id: transactionToEdit.id, data: values });
      } else {
        // Create new transaction
        result = await createTransaction(values);
      }
      onSubmitSuccess?.(result);
      form.reset(); // Reset form after successful submission
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      // TODO: Show error to user (e.g., using react-hot-toast)
      alert(`Error: ${error.message || 'Failed to save transaction.'}`); // Removed extra backtick
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Date Picker */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date('1900-01-01')
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description Input */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Coffee, Groceries, Paycheck..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount Input */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type Select */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
                  <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Envelope Select */}
        <FormField
          control={form.control}
          name="envelopeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Envelope</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingEnvelopes}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingEnvelopes ? "Loading envelopes..." : "Select an envelope"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {envelopes?.map((envelope) => (
                    <SelectItem key={envelope.id} value={envelope.id}>
                      {envelope.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
           <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
             Cancel
           </Button>
           <Button type="submit" disabled={isSubmitting}>
             {isSubmitting ? 'Saving...' : (transactionToEdit?.id ? 'Update Transaction' : 'Add Transaction')}
           </Button>
         </div>
      </form>
    </Form>
  );
}

// Export the form component
export default TransactionForm; 