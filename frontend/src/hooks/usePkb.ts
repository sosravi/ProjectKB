import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth.ts';
import { pkbService } from '../services/pkbService';

export interface Pkb {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  contentCount?: number;
}

export interface CreatePkbData {
  name: string;
  description: string;
}

export interface UpdatePkbData {
  name?: string;
  description?: string;
}

export const usePkb = () => {
  const { isAuthenticated, user } = useAuth();
  const [pkbs, setPkbs] = useState<Pkb[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPkbs = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await pkbService.getPkbs();
      setPkbs(data.pkbs || []);
    } catch (err: any) {
      console.error('Failed to load PKBs:', err);
      setError(err.message || 'Failed to load PKBs');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const createPkb = useCallback(async (pkbData: CreatePkbData): Promise<Pkb> => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const newPkb = await pkbService.createPkb(pkbData);
      setPkbs(prev => [newPkb, ...prev]);
      return newPkb;
    } catch (err: any) {
      console.error('Failed to create PKB:', err);
      setError(err.message || 'Failed to create PKB');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const updatePkb = useCallback(async (pkbId: string, updateData: UpdatePkbData): Promise<Pkb> => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedPkb = await pkbService.updatePkb(pkbId, updateData);
      setPkbs(prev => prev.map(pkb => pkb.id === pkbId ? updatedPkb : pkb));
      return updatedPkb;
    } catch (err: any) {
      console.error('Failed to update PKB:', err);
      setError(err.message || 'Failed to update PKB');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const deletePkb = useCallback(async (pkbId: string): Promise<void> => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      await pkbService.deletePkb(pkbId);
      setPkbs(prev => prev.filter(pkb => pkb.id !== pkbId));
    } catch (err: any) {
      console.error('Failed to delete PKB:', err);
      setError(err.message || 'Failed to delete PKB');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const getPkbById = useCallback((pkbId: string): Pkb | undefined => {
    return pkbs.find(pkb => pkb.id === pkbId);
  }, [pkbs]);

  const searchPkbs = useCallback(async (query: string): Promise<Pkb[]> => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    if (query.length < 3) {
      return pkbs; // Return all PKBs if query is too short
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await pkbService.searchPkbs(query);
      return data.pkbs || [];
    } catch (err: any) {
      console.error('Failed to search PKBs:', err);
      setError(err.message || 'Failed to search PKBs');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, pkbs]);

  const refreshPkbs = useCallback(() => {
    loadPkbs();
  }, [loadPkbs]);

  // Load PKBs when component mounts or authentication changes
  useEffect(() => {
    loadPkbs();
  }, [loadPkbs]);

  return {
    pkbs,
    isLoading,
    error,
    createPkb,
    updatePkb,
    deletePkb,
    getPkbById,
    searchPkbs,
    refreshPkbs,
  };
};
