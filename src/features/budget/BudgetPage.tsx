import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useAction } from 'wasp/client/operations';
import {
  getEnvelopes,
  getMyBudget,
  createEnvelope,
  updateEnvelope,
  deleteEnvelope,
  // Collaboration actions/queries
  inviteCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
  findUserByEmail,
  getBudgetCollaborators,
} from 'wasp/client/operations';
// Import the specific type from the operations file
import { type EnvelopeWithSummary } from './operations'; // Use the new type
import { useAuth } from 'wasp/client/auth';
import { Link } from 'wasp/client/router';
import { type User } from 'wasp/entities'; // Import User type

// Import Layout components
import { Header } from '../../components/layout/header';
import { Main } from '../../components/layout/main';
import { Search } from '../../components/search';
import { ThemeSwitch } from '../../components/theme-switch';
import { ProfileDropdown } from '../../components/profile-dropdown';

// Import Shadcn UI components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/card';
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
import { Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { Progress } from '../../components/ui/progress'; // Uncommented
import { cn } from "../../lib/cn"; // Import cn utility
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"; // For collaborator list
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"; // For role selection
import { Badge } from "../../components/ui/badge"; // Ensure Badge is imported

// Define collaborator role string literal type for client-side use
type ClientCollaboratorRole = 'EDITOR' | 'VIEWER';

// Helper function for currency formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Type for the found user object returned by the query
type FoundUser = { id: string; email: string };

export default function BudgetPage() {
  const { data: user, isLoading: userLoading } = useAuth();
  // Fetch the user's budget directly
  const { data: myBudget, isLoading: budgetLoading } = useQuery(getMyBudget);
  // Fetch envelopes (still needed for display)
  const { data: envelopesData, isLoading: envelopesLoading, error: envelopesError } = useQuery(getEnvelopes);

  // Use the ID from the fetched budget
  const budgetId = myBudget?.id;

  // Fetch collaborators using the budgetId from getMyBudget
  const { data: collaborators, isLoading: collaboratorsLoading, error: collaboratorsError } = useQuery(
    getBudgetCollaborators,
    { budgetId: budgetId! },
    { enabled: !!budgetId } // Query enabled only when budgetId is available
  );

  const [newEnvelopeName, setNewEnvelopeName] = useState('');

  const [isConfirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  // Update state types to use EnvelopeWithSummary
  const [envelopeToDelete, setEnvelopeToDelete] = useState<EnvelopeWithSummary | null>(null);

  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  // Update state types to use EnvelopeWithSummary
  const [envelopeBeingEdited, setEnvelopeBeingEdited] = useState<EnvelopeWithSummary | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', allocatedAmount: 0 });

  // State for collaboration UI
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isConfirmRemoveCollabOpen, setIsConfirmRemoveCollabOpen] = useState(false);
  const [collaboratorToRemove, setCollaboratorToRemove] = useState<any | null>(null); // Type needed
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [collaboratorToEditRole, setCollaboratorToEditRole] = useState<any | null>(null); // Type needed
  const [newRole, setNewRole] = useState<ClientCollaboratorRole>('VIEWER'); // Use string literal

  // State for Invite Modal
  const [inviteEmail, setInviteEmail] = useState('');
  // Store the full found user object (or null/undefined)
  const [foundUser, setFoundUser] = useState<FoundUser | null | undefined>(undefined);
  const [inviteRole, setInviteRole] = useState<ClientCollaboratorRole>('VIEWER');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Reset edit form data when envelopeBeingEdited changes
  useEffect(() => {
    if (envelopeBeingEdited) {
      setEditFormData({
        name: envelopeBeingEdited.name,
        allocatedAmount: envelopeBeingEdited.allocatedAmount,
      });
    } else {
      setEditFormData({ name: '', allocatedAmount: 0 });
    }
  }, [envelopeBeingEdited]);

  const handleCreateEnvelope = async () => {
    // Use budgetId derived from getMyBudget query
    if (!newEnvelopeName.trim() || !budgetId) {
        console.error("Cannot create envelope: Missing name or budget ID.");
        // Optionally show an error message to the user
        return;
    }
    try {
      await createEnvelope({ name: newEnvelopeName, budgetId: budgetId }); 
      setNewEnvelopeName('');
    } catch (error: any) {
      alert('Error creating envelope: ' + (error?.message || 'Unknown error'));
    }
  };

  const openEditDialog = (envelope: EnvelopeWithSummary) => { // Use updated type
    setEnvelopeBeingEdited(envelope);
    // useEffect handles setting editFormData
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

  const openDeleteDialog = (envelope: EnvelopeWithSummary) => { // Use updated type
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

  // --- Collaboration Handlers (Placeholders) ---
  const openInviteModal = () => setIsInviteModalOpen(true);

  const openRemoveConfirmDialog = (collaborator: any) => {
    setCollaboratorToRemove(collaborator);
    setIsConfirmRemoveCollabOpen(true);
  };

  const handleRemoveCollaboratorConfirm = async () => {
     // Ensure budgetId from getMyBudget is used
     if (!collaboratorToRemove || !budgetId) return;
    try {
      await removeCollaborator({ budgetId: budgetId, userIdToRemove: collaboratorToRemove.user.id });
      setIsConfirmRemoveCollabOpen(false);
      setCollaboratorToRemove(null);
      // Optionally refetch collaborators
    } catch (error: any) {
      alert('Error removing collaborator: ' + (error.message || 'Unknown error'));
    }
  };

  const openEditRoleModal = (collaborator: any) => {
    setCollaboratorToEditRole(collaborator);
    // Set initial role using string literal from collaborator data
    setNewRole(collaborator.role as ClientCollaboratorRole); 
    setIsEditRoleModalOpen(true);
  };

  const handleUpdateRoleSubmit = async () => {
     // Ensure budgetId from getMyBudget is used
     if (!collaboratorToEditRole || !budgetId) return;
    try {
      // Pass the string literal role
      await updateCollaboratorRole({ 
        budgetId: budgetId, 
        collaboratorUserId: collaboratorToEditRole.user.id, 
        newRole: newRole 
      });
      setIsEditRoleModalOpen(false);
      setCollaboratorToEditRole(null);
    } catch (error: any) {
      alert('Error updating role: ' + (error.message || 'Unknown error'));
    }
  };

  // --- End Collaboration Handlers ---

  // Determine owner status (can potentially use myBudget.userId)
  const isOwner = useMemo(() => {
    if (!user || !myBudget) return false;
    return myBudget.userId === user.id;
  }, [user, myBudget]);

  // --- Handlers ---
  const handleInviteEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInviteEmail(e.target.value);
    setFoundUser(undefined); // Reset found user state
    setSearchError(null);
    setInviteError(null);
  };

  const handleSearchUser = async () => {
    if (!inviteEmail.trim()) return;
    setIsSearchingUser(true);
    setSearchError(null);
    setInviteError(null);
    setFoundUser(undefined); // Reset previous search
    try {
      // findUserByEmail returns { id: string, email: string } | null
      const result = await findUserByEmail({ email: inviteEmail });
      setFoundUser(result); // Store the whole result (or null)
    } catch (error: any) {
      console.error("Search user error:", error);
      setSearchError(error.message || 'Failed to search for user.');
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleInviteSubmit = async () => {
    // Ensure budgetId from getMyBudget is used
    if (!foundUser || !foundUser.id || !budgetId) return;
    setInviteError(null);
    try {
      await inviteCollaborator({
        budgetId: budgetId,
        inviteeUserId: foundUser.id, // Use the ID from state
        role: inviteRole,
      });
      setIsInviteModalOpen(false);
      // Reset state after successful invite
      setInviteEmail('');
      setFoundUser(undefined);
      setInviteRole('VIEWER');
    } catch (error: any) {
      console.error("Invite error:", error);
      setInviteError(error.message || "Failed to invite user.");
    }
  };

  // Reset invite modal state when closing
  useEffect(() => {
    if (!isInviteModalOpen) {
      setInviteEmail('');
      setFoundUser(undefined); // Reset found user state
      setInviteRole('VIEWER');
      setSearchError(null);
      setInviteError(null);
      setIsSearchingUser(false);
    }
  }, [isInviteModalOpen]);

  // Update loading check
  if (userLoading || budgetLoading || envelopesLoading) {
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
      <Main className="p-4 space-y-6">
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
          {envelopesData && envelopesData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {envelopesData.map((envelope) => {
                const isOwnedByUser = user?.id === envelope.budget.userId; // Check ownership
                const spentPercentage = envelope.allocatedAmount > 0 
                  ? Math.min((envelope.spent / envelope.allocatedAmount) * 100, 100) 
                  : 0;
                const isOverBudget = envelope.remaining < 0;

                return (
                  <Card key={envelope.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-start">
                        <div className="flex flex-col gap-1 mr-2">
                           <span className="break-words">{envelope.name}</span>
                           {/* Add Shared indicator if not owned by current user */} 
                           {!isOwnedByUser && (
                             <Badge variant="secondary" className="w-fit">
                               <Users className="h-3 w-3 mr-1" />
                               Shared
                             </Badge>
                           )}
                         </div>
                         <div className="flex space-x-1 flex-shrink-0">
                            {/* Conditionally render Edit/Delete? Or handle permissions in actions */}
                            {/* For now, assume buttons shown, actions handle permissions */} 
                           <Button variant="ghost" size="icon" onClick={() => openEditDialog(envelope)}>
                             <Pencil className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => openDeleteDialog(envelope)}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-muted-foreground">Allocated: {formatCurrency(envelope.allocatedAmount)}</div>
                      
                      {/* Progress Bar (uncommented) */}
                      <Progress 
                        value={spentPercentage} 
                        className={cn(isOverBudget ? "[&>div]:bg-red-500" : "")}
                      /> 
                      
                      <div className="flex justify-between text-sm">
                        <span>Spent: {formatCurrency(envelope.spent)}</span>
                        <span className={cn(isOverBudget ? "text-red-600 font-medium" : "text-muted-foreground")}>
                          Remaining: {formatCurrency(envelope.remaining)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p>No envelopes created yet. Add one above!</p>
          )}
        </div>

        {/* --- Collaboration Section --- */}
        {budgetId && isOwner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Collaborators</CardTitle>
                <CardDescription>Manage who can access this budget.</CardDescription>
              </div>
               {/* TODO: Implement Invite Modal Trigger */}
               <Button onClick={openInviteModal} size="sm">
                 <UserPlus className="h-4 w-4 mr-2"/>
                 Invite
               </Button>
            </CardHeader>
            <CardContent>
              {collaboratorsLoading && <p>Loading collaborators...</p>}
              {collaboratorsError && <p className="text-red-500">Error loading collaborators: {collaboratorsError.message}</p>}
              {collaborators && collaborators.length > 0 ? (
                <ul className="space-y-3">
                  {collaborators.map((collab) => (
                    <li key={collab.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{collab.user.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          {/* Display User Email (or fallback) */}
                          <p className="text-sm font-medium leading-none">
                             {collab.user.email || `User ID: ${collab.userId}`}
                           </p>
                          <p className="text-sm text-muted-foreground">Role: {collab.role}</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                         {/* TODO: Implement Edit Role Button/Modal Trigger */}
                        <Button variant="ghost" size="icon" onClick={() => openEditRoleModal(collab)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                         {/* TODO: Implement Remove Button/Dialog Trigger */}
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => openRemoveConfirmDialog(collab)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No collaborators yet.</p>
              )}
            </CardContent>
          </Card>
        )}
        {/* --- End Collaboration Section --- */}

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

        {/* Edit Role Modal Implementation */}
        <Dialog open={isEditRoleModalOpen} onOpenChange={setIsEditRoleModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Collaborator Role</DialogTitle>
              <DialogDescription>
                Change the role for {collaboratorToEditRole?.user?.email || 'this user'}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
               <Label htmlFor="role-select">Role</Label>
                <Select 
                  value={newRole} 
                  onValueChange={(value: string) => setNewRole(value as ClientCollaboratorRole)}
                 >
                  <SelectTrigger id="role-select">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" onClick={handleUpdateRoleSubmit}>Save Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Collaborator Confirmation Dialog */}
        <ConfirmDialog
           open={isConfirmRemoveCollabOpen}
           onOpenChange={setIsConfirmRemoveCollabOpen}
           title="Remove Collaborator?"
           desc={`Are you sure you want to remove ${collaboratorToRemove?.user?.email || 'this user'} from this budget?`}
           confirmText="Remove"
           destructive={true}
           handleConfirm={handleRemoveCollaboratorConfirm}
         />

        {/* --- Invite Collaborator Modal --- */}
         <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Invite Collaborator</DialogTitle>
               <DialogDescription>
                 Enter the email address of the user you want to invite to this budget.
               </DialogDescription>
             </DialogHeader>
             <div className="py-4 space-y-4">
               {/* Email Search */}
               <div className="space-y-2">
                 <Label htmlFor="invite-email">User Email</Label>
                 <div className="flex space-x-2">
                   <Input 
                     id="invite-email"
                     type="email"
                     placeholder="user@example.com"
                     value={inviteEmail}
                     onChange={handleInviteEmailChange}
                     disabled={isSearchingUser}
                   />
                   <Button onClick={handleSearchUser} disabled={!inviteEmail.trim() || isSearchingUser}>
                     {isSearchingUser ? "Searching..." : "Search"}
                   </Button>
                 </div>
                 {searchError && <p className="text-sm text-red-500">{searchError}</p>}
               </div>

               {/* Found User Display (only shows email) */}
               {foundUser === null && (
                 <p className="text-sm text-muted-foreground">User not found.</p>
               )}
               {foundUser && (
                 <div className="p-3 border rounded-md bg-muted">
                   <p className="text-sm font-medium">User found:</p>
                   {/* Only display email from the foundUser object */}
                   <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                 </div>
               )}

               {/* Role Selection (enabled when user found) */}
               {foundUser && (
                 <div className="space-y-2">
                   <Label htmlFor="invite-role">Assign Role</Label>
                   <Select 
                      value={inviteRole} 
                      onValueChange={(value: string) => setInviteRole(value as ClientCollaboratorRole)}
                    >
                     <SelectTrigger id="invite-role">
                       <SelectValue placeholder="Select a role" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="EDITOR">Editor</SelectItem>
                       <SelectItem value="VIEWER">Viewer</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               )}
               
               {inviteError && <p className="text-sm text-red-500 mt-2">{inviteError}</p>}
             </div>
             <DialogFooter>
               <DialogClose asChild>
                 <Button type="button" variant="outline">Cancel</Button>
               </DialogClose>
               <Button 
                 type="button" 
                 onClick={handleInviteSubmit} 
                 disabled={!foundUser} // Enable button only if foundUser object exists
                >
                 Invite User
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
        {/* --- End Invite Collaborator Modal --- */}

      </Main>
    </>
  );
} 