'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { ref, listAll, getDownloadURL, getMetadata, deleteObject } from 'firebase/storage';
import { useStorage } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Folder, File, Trash2, Download, Loader2, FolderKanban, ArrowUp, ChevronRight } from 'lucide-react';
import { useAdminOnly } from '@/hooks/useAdminOnly';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type FileOrFolder = {
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  createdAt?: Date;
  fullPath: string;
};

const PathNavigator = ({ currentPath, onNavigate }: { currentPath: string, onNavigate: (path: string) => void }) => {
    const pathParts = currentPath.split('/').filter(p => p);
  
    return (
        <div className="flex items-center gap-1.5 flex-wrap p-2 bg-muted rounded-md mb-4">
            <button
                onClick={() => onNavigate('')}
                className={cn(
                    "text-sm font-medium hover:underline",
                    currentPath === '' ? "text-primary font-bold" : "text-muted-foreground"
                )}
            >
                / (root)
            </button>
            {pathParts.map((part, index) => {
                const path = pathParts.slice(0, index + 1).join('/');
                const isLast = index === pathParts.length - 1;
                return (
                    <Fragment key={path}>
                         <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <button
                            onClick={() => onNavigate(path)}
                            className={cn(
                                "text-sm font-medium hover:underline",
                                isLast ? "text-primary font-bold" : "text-muted-foreground"
                            )}
                        >
                            {part}
                        </button>
                    </Fragment>
                );
            })}
        </div>
    );
};

export default function StorageManagementPage() {
  useAdminOnly();
  const storage = useStorage();
  const { toast } = useToast();
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<FileOrFolder[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchItems = useCallback(async (path: string) => {
    if (!storage) return;
    setLoading(true);
    const storageRef = ref(storage, path);
    try {
      const res = await listAll(storageRef);
      const folders: FileOrFolder[] = res.prefixes.map(folderRef => ({ name: folderRef.name, type: 'folder', path: folderRef.fullPath, fullPath: folderRef.fullPath }));
      
      const filePromises = res.items.map(async itemRef => {
        const metadata = await getMetadata(itemRef);
        return { name: itemRef.name, type: 'file' as FileOrFolder['type'], path: itemRef.fullPath, size: metadata.size, createdAt: new Date(metadata.timeCreated), fullPath: itemRef.fullPath };
      });

      const files = await Promise.all(filePromises);
      files.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

      setItems([...folders, ...files]);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({ title: 'Failed to load files and folders.', variant: 'destructive'});
    } finally {
      setLoading(false);
      setSelectedItems([]);
    }
  }, [storage, toast]);

  useEffect(() => {
    fetchItems(currentPath);
  }, [currentPath, fetchItems]);

  const handleSelect = (path: string) => {
    setSelectedItems(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? items.map(item => item.path) : []);
  };

  const handleDeleteSelected = async () => {
    if (!storage) return;
    setIsDeleting(true);
    const deletionToast = toast({ title: `Deleting ${selectedItems.length} item(s)...` });
    const promises = selectedItems.map(path => deleteObject(ref(storage, path)));
    try {
      await Promise.all(promises);
      toast({ id: deletionToast.id, title: 'Success', description: `${selectedItems.length} item(s) deleted successfully.`, className: 'bg-green-100 text-green-800' });
      fetchItems(currentPath); // Refresh list
    } catch (error: any) {
      console.error('Error deleting items:', error);
      toast({ id: deletionToast.id, title: 'Failed to delete some items.', description: error.message, variant: 'destructive'});
    } finally {
        setIsDeleting(false);
    }
  };

  const handleItemClick = async (item: FileOrFolder) => {
      if (item.type === 'folder') {
          setCurrentPath(item.path);
      } else if (storage) {
          try {
              const url = await getDownloadURL(ref(storage, item.path));
              window.open(url, '_blank');
          } catch(error) {
              toast({ title: 'Could not get download URL.', variant: 'destructive'});
          }
      }
  }

  const renderRow = (item: FileOrFolder, isMobile = false) => {
      const isSelected = selectedItems.includes(item.path);
      
      const content = (
          <>
            <div className="flex items-center gap-3">
              <Checkbox onCheckedChange={() => handleSelect(item.path)} checked={isSelected} className="mr-2" onClick={e => e.stopPropagation()} />
               {item.type === 'folder' ? <Folder className="h-5 w-5 text-primary" /> : <File className="h-5 w-5 text-muted-foreground" />}
              <div className="flex flex-col">
                <span className="font-medium truncate">{item.name}</span>
                {isMobile && item.createdAt && <span className="text-xs text-muted-foreground">{format(item.createdAt, 'PPp')}</span>}
              </div>
            </div>
            {isMobile && item.size && <div className="text-sm text-muted-foreground">{(item.size / 1024).toFixed(2)} KB</div>}
          </>
      );

      if (isMobile) {
          return (
             <div key={item.path} className={cn("p-3 border rounded-lg flex items-center justify-between", isSelected ? "bg-muted" : "bg-card")} onClick={() => handleItemClick(item)}>
               {content}
             </div>
          )
      }

      return (
         <TableRow key={item.path} data-state={isSelected ? "selected" : undefined} onClick={() => handleItemClick(item)} className="cursor-pointer">
            <TableCell onClick={e => e.stopPropagation()}><Checkbox onCheckedChange={() => handleSelect(item.path)} checked={isSelected} /></TableCell>
            <TableCell>{content}</TableCell>
            <TableCell className="hidden md:table-cell">{item.size ? (item.size / 1024).toFixed(2) + ' KB' : '-'}</TableCell>
            <TableCell className="hidden md:table-cell">{item.createdAt ? format(item.createdAt, 'PPp') : '-'}</TableCell>
         </TableRow>
      )
  };


  return (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2"><FolderKanban/>Storage Management</h2>
        <Card>
            <CardHeader>
                <CardTitle>Storage Browser</CardTitle>
                <CardDescription>Browse, view, and delete files from your Firebase Storage bucket. This is useful for cleaning up old screenshots.</CardDescription>
            </CardHeader>
        <CardContent>
            <PathNavigator currentPath={currentPath} onNavigate={setCurrentPath} />
            <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{items.length} items found</p>
            {selectedItems.length > 0 && (
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete ({selectedItems.length})
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the selected {selectedItems.length} item(s). This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSelected}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            )}
            </div>
            {loading ? (
                <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : items.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><p>No files or folders found in this directory.</p></div>
            ) : (
            <>
                <div className="border rounded-md hidden md:block">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[50px]"><Checkbox onCheckedChange={(checked) => handleSelectAll(!!checked)} checked={items.length > 0 && selectedItems.length === items.length} /></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Size</TableHead>
                        <TableHead className="hidden md:table-cell">Created At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>{items.map(item => renderRow(item, false))}</TableBody>
                    </Table>
                </div>
                <div className="grid md:hidden gap-2">
                    <div className="flex items-center p-2"><Checkbox id="select-all-mobile" onCheckedChange={(checked) => handleSelectAll(!!checked)} checked={items.length > 0 && selectedItems.length === items.length} /><label htmlFor="select-all-mobile" className="ml-2 text-sm font-medium">Select All</label></div>
                    {items.map(item => renderRow(item, true))}
                </div>
            </>
            )}
        </CardContent>
        </Card>
    </div>
  );
};
