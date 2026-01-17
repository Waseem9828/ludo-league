'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { useSuperAdminOnly } from '@/hooks/useSuperAdminOnly';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Loader2, MoreHorizontal } from 'lucide-react';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
}

export function AdminManager() {
  useSuperAdminOnly();
  const functions = getFunctions();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // UID of user being updated

  const listUsers = useCallback(async () => {
    if (!functions) return;
    setLoading(true);
    try {
      const listUsersFunction = httpsCallable(functions, 'listUsers');
      const result = await listUsersFunction();
      const userList = result.data as User[];
      setUsers(userList);
    } catch (error) {
      console.error('Error listing users:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch user list.' });
    } finally {
      setLoading(false);
    }
  }, [functions, toast]);

  useEffect(() => {
    listUsers();
  }, [listUsers]);

  const handleSetRole = async (uid: string, role: string) => {
    if (!functions) return;
    setIsUpdating(uid);
    try {
      const setRoleFunction = httpsCallable(functions, 'setRole');
      const result = await setRoleFunction({ uid, role });
      toast({ title: 'Success', description: (result.data as { message: string }).message, className: 'bg-green-100 text-green-800' });
      // Refresh user list to show new role
      listUsers(); 
    } catch (error: any) {
      console.error('Error setting role:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsUpdating(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>UID</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.uid}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>{user.displayName || 'N/A'}</TableCell>
              <TableCell className="font-mono text-xs">{user.uid}</TableCell>
              <TableCell className="font-semibold">{user.role || 'User'}</TableCell>
              <TableCell className="text-right">
                {isUpdating === user.uid ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleSetRole(user.uid, 'superAdmin')}>Make Super Admin</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetRole(user.uid, 'depositAdmin')}>Make Deposit Admin</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetRole(user.uid, 'withdrawalAdmin')}>Make Withdrawal Admin</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetRole(user.uid, 'matchAdmin')}>Make Match Admin</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetRole(user.uid, 'none')}>Remove Admin Role</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
