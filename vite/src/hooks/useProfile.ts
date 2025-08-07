'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface UserProfile {
  walletAddress: string;
  displayName: string;
  bio: string;
  favoriteGame: string;
  country: string;
  clan: string;
  avatar: string;
  playStyle: string;
  discord: string;
  steam: string;
  twitter: string;
  twitch: string;
  createdAt: Date;
  updatedAt: Date;
}

const fetchProfile = async (walletAddress: string): Promise<UserProfile> => {
  const response = await fetch(`/api/profile?wallet=${walletAddress}`);
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  return response.json();
};

const updateProfile = async (walletAddress: string, profileData: Partial<UserProfile>): Promise<UserProfile> => {
  const response = await fetch(`/api/profile?wallet=${walletAddress}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update profile');
  }
  
  const result = await response.json();
  return result.profile;
};

const deleteProfile = async (walletAddress: string): Promise<void> => {
  const response = await fetch(`/api/profile?wallet=${walletAddress}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete profile');
  }
};

export const useProfile = (walletAddress?: string) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});

  const {
    data: profile,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['profile', walletAddress],
    queryFn: () => fetchProfile(walletAddress!),
    enabled: !!walletAddress,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: (profileData: Partial<UserProfile>) => updateProfile(walletAddress!, profileData),
    onSuccess: (updatedProfile) => {
      // Update the cache with the new profile data
      queryClient.setQueryData(['profile', walletAddress], updatedProfile);
      setIsEditing(false);
      setEditData({});
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProfile(walletAddress!),
    onSuccess: () => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['profile', walletAddress] });
    },
    onError: (error) => {
      console.error('Error deleting profile:', error);
    }
  });

  const startEdit = () => {
    setIsEditing(true);
    setEditData(profile || {});
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editData.displayName || editData.displayName.trim().length === 0) {
      throw new Error('Display name is required');
    }
    
    await updateMutation.mutateAsync(editData);
  };

  const updateEditData = (field: keyof UserProfile, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return {
    profile,
    error,
    isLoading,
    refetch,
    // Edit mode
    isEditing,
    editData,
    startEdit,
    cancelEdit,
    saveEdit,
    updateEditData,
    // Mutations
    updateMutation,
    deleteMutation,
    // States
    isSaving: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    saveError: updateMutation.error?.message,
    deleteError: deleteMutation.error?.message,
  };
};