
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, onSnapshot, limit } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Loader2, User, Landmark, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';

type SearchResult = {
  id: string;
  type: 'user' | 'deposit' | 'withdrawal';
  label: string;
  path: string;
};

export function UniversalSearch() {
  const firestore = useFirestore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const performSearch = useCallback(async (term: string) => {
    if (!firestore || term.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);

    const allResults: SearchResult[] = [];

    // Search Users
    const usersQuery = query(collection(firestore, 'users'));
    const usersUnsub = onSnapshot(usersQuery, (snapshot) => {
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.displayName?.toLowerCase().includes(term.toLowerCase()) || data.email?.toLowerCase().includes(term.toLowerCase())) {
                allResults.push({ id: doc.id, type: 'user', label: data.displayName || data.email, path: `/admin/users/${doc.id}` });
            }
        });
    });

    // Search Deposits
    const depositsQuery = query(collection(firestore, 'depositRequests'));
     const depositsUnsub = onSnapshot(depositsQuery, (snapshot) => {
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.utr?.toLowerCase().includes(term.toLowerCase())) {
                allResults.push({ id: doc.id, type: 'deposit', label: `Deposit: ${data.utr}`, path: `/admin/deposits` });
            }
        });
    });

    // Search Withdrawals
    const withdrawalsQuery = query(collection(firestore, 'withdrawalRequests'));
    const withdrawalsUnsub = onSnapshot(withdrawalsQuery, (snapshot) => {
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.upiId?.toLowerCase().includes(term.toLowerCase())) {
                allResults.push({ id: doc.id, type: 'withdrawal', label: `Withdrawal: ${data.upiId}`, path: `/admin/withdrawals` });
            }
        });
    });
    
    setResults(allResults.slice(0, 10)); // Limit to 10 results
    setLoading(false);

    return () => {
        usersUnsub();
        depositsUnsub();
        withdrawalsUnsub();
    }

  }, [firestore]);

  useEffect(() => {
    const unsubscribe = performSearch(debouncedSearchTerm);
    return () => {
        if (unsubscribe) {
            (async () => {
                const cleanup = await unsubscribe;
                if(cleanup) cleanup();
            })();
        }
    }
  }, [debouncedSearchTerm, performSearch]);

  const handleSelect = (path: string) => {
    router.push(path);
    setSearchTerm('');
    setIsOpen(false);
  };

  const getIcon = (type: 'user' | 'deposit' | 'withdrawal') => {
      switch(type) {
          case 'user': return <User className="h-4 w-4 text-muted-foreground" />;
          case 'deposit': return <Landmark className="h-4 w-4 text-muted-foreground" />;
          case 'withdrawal': return <DollarSign className="h-4 w-4 text-muted-foreground" />;
      }
  }

  return (
    <div className="relative w-full max-w-md">
      <Input
        type="search"
        placeholder="Search anything... (users, UTR, UPI ID)"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Delay to allow click
        className="w-full"
      />
      {isOpen && (searchTerm.length > 2) && (
        <div className="absolute z-50 top-full mt-2 w-full rounded-md border bg-background shadow-lg">
          {loading && <div className="p-4 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div>}
          {!loading && results.length === 0 && debouncedSearchTerm.length > 2 && <p className="p-4 text-sm text-center text-muted-foreground">No results found.</p>}
          {!loading && results.length > 0 && (
            <ul>
              {results.map(result => (
                <li key={result.id + result.type} 
                    onMouseDown={() => handleSelect(result.path)} 
                    className="flex items-center gap-3 px-4 py-2 hover:bg-muted cursor-pointer border-b last:border-b-0">
                    {getIcon(result.type)}
                    <span>{result.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
