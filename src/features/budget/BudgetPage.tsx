import React, { useState, useEffect } from 'react';
import { useQuery } from 'wasp/client/operations';
import { getEnvelopes, createEnvelope, updateEnvelope, deleteEnvelope } from 'wasp/client/operations';
import { type Envelope } from 'wasp/entities';
import { useAuth } from 'wasp/client/auth';
import { Link } from 'wasp/client/router';

// Import Shadcn UI components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { Pencil, Trash2 } from 'lucide-react';

export default function BudgetPage() {
  const { data: user, isLoading: userLoading } = useAuth();
  const { data: envelopes, isLoading: envelopesLoading, error: envelopesError } = useQuery(getEnvelopes);

  const [newEnvelopeName, setNewEnvelopeName] = useState('');

  const [isConfirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [envelopeToDelete, setEnvelopeToDelete] = useState<Envelope | null>(null);

  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [envelopeBeingEdited, setEnvelopeBeingEdited] = useState<Envelope | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', allocatedAmount: 0 });

  const handleCreateEnvelope = async () => {
    if (!newEnvelopeName.trim()) return; // Basic validation
    try {
      await createEnvelope({ name: newEnvelopeName });
      setNewEnvelopeName(''); // Clear input on success
    } catch (error: any) {
      // TODO: Replace with better error handling/toast notification
      alert('Error creating envelope: ' + (error?.message || 'Unknown error'));
    }
  };

  const openEditDialog = (envelope: Envelope) => {
    setEnvelopeBeingEdited(envelope);
    setEditFormData({ 
      name: envelope.name, 
      allocatedAmount: envelope.allocatedAmount 
    });
    setEditDialogOpen(true);
  }

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ 
      ...prev, 
      [name]: name === 'allocatedAmount' ? parseFloat(value) || 0 : value 
    }));
  }

  const handleUpdateEnvelope = async () => {
    if (!envelopeBeingEdited || !editFormData.name.trim()) return;
    try {
      await updateEnvelope({ 
        id: envelopeBeingEdited.id, 
        data: { 
          name: editFormData.name,
          allocatedAmount: editFormData.allocatedAmount
        } 
      });
      setEditDialogOpen(false); // Close dialog on success
      setEnvelopeBeingEdited(null);
    } catch (error: any) {
      alert('Error updating envelope: ' + (error?.message || 'Unknown error'));
    }
  }

  const openDeleteDialog = (envelope: Envelope) => {
    setEnvelopeToDelete(envelope);
    setConfirmDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = async () => {
    if (!envelopeToDelete) return;
    try {
      await deleteEnvelope({ id: envelopeToDelete.id });
      setConfirmDeleteDialogOpen(false); // Close dialog on success
      setEnvelopeToDelete(null);
    } catch (error: any) {
      alert('Error deleting envelope: ' + (error?.message || 'Unknown error'));
    }
  }

  if (userLoading || envelopesLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // This should technically not happen due to `auth: true` on the page,
    // but good practice to handle it.
    return <Link to="/login">Please login</Link>;
  }

  if (envelopesError) {
    return <div>Error loading envelopes: {envelopesError.message}</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">My Budget Envelopes</h1>

      {/* Section to add a new envelope */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Envelope</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Label htmlFor="envelope-name" className="sr-only">Envelope Name</Label>
            <Input 
              id="envelope-name"
              type="text"
              placeholder="E.g., Groceries, Rent, Fun Money"
              value={newEnvelopeName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEnvelopeName(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleCreateEnvelope}>Add Envelope</Button>
          </div>
        </CardContent>
      </Card>

      {/* Section to display existing envelopes */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Existing Envelopes</h2>
        {envelopes && envelopes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {envelopes.map((envelope) => (
              <Card key={envelope.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{envelope.name}</span>
                    <div className="flex space-x-1">
                       <Button variant="ghost" size="icon" onClick={() => openEditDialog(envelope)}>
                         <Pencil className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => openDeleteDialog(envelope)}>
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Allocated: ${envelope.allocatedAmount.toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No envelopes created yet. Add one above!</p>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Envelope</DialogTitle>
            <DialogDescription>
              Update the name and allocated amount for this envelope.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input 
                id="edit-name"
                name="name"
                value={editFormData.name}
                onChange={handleEditFormChange}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-allocatedAmount" className="text-right">
                Allocated Amount
              </Label>
              <Input 
                id="edit-allocatedAmount"
                name="allocatedAmount"
                type="number"
                step="0.01"
                value={editFormData.allocatedAmount}
                onChange={handleEditFormChange}
                className="col-span-3" 
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
               <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleUpdateEnvelope}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={setConfirmDeleteDialogOpen}
        title="Delete Envelope?"
        desc={`Are you sure you want to delete the envelope "${envelopeToDelete?.name || ''}"? This action cannot be undone.`}
        confirmText="Delete"
        destructive={true}
        handleConfirm={handleDeleteConfirm}
      />

    </div>
  );
} 