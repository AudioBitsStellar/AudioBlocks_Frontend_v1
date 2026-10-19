'use client';

import { useState } from 'react';
import { Trash2, UserPlus, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PlaylistCollaborator } from '@/types/playlist';

interface CollaboratorsPanelProps {
  playlistId: string;
  isOwner: boolean;
}

export default function CollaboratorsPanel({ playlistId, isOwner }: CollaboratorsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor'>('viewer');
  const queryClient = useQueryClient();

  const { data: collaborators = [], isLoading } = useQuery<PlaylistCollaborator[]>({
    queryKey: ['playlist', playlistId, 'collaborators'],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/playlists/${playlistId}/collaborators`);
      if (!response.ok) throw new Error('Failed to fetch collaborators');
      return response.json();
    },
    enabled: !!playlistId,
  });

  const addCollaboratorMutation = useMutation({
    mutationFn: async (username: string) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/playlists/${playlistId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role: selectedRole }),
      });
      if (response.status === 403) throw new Error('Permission denied');
      if (!response.ok) throw new Error('Failed to add collaborator');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId, 'collaborators'] });
      setSearchQuery('');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ collaboratorId, role }: { collaboratorId: string; role: 'viewer' | 'editor' }) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/playlists/${playlistId}/collaborators/${collaboratorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (response.status === 403) throw new Error('Permission denied');
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId, 'collaborators'] });
    },
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/playlists/${playlistId}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
      });
      if (response.status === 403) throw new Error('Permission denied');
      if (!response.ok) throw new Error('Failed to remove collaborator');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId, 'collaborators'] });
    },
  });

  if (!isOwner) return null;

  const handleAddCollaborator = () => {
    if (searchQuery.trim()) {
      addCollaboratorMutation.mutate(searchQuery.trim());
    }
  };

  return (
    <div className="bg-surface-input rounded-lg p-6 border border-border-dark">
      <h3 className="text-lg font-semibold text-white mb-4">Collaborators</h3>

      {isLoading ? (
        <div className="text-sm text-on-muted">Loading collaborators...</div>
      ) : (
        <>
          <div className="mb-6 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search users by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-surface-elevated border-border-dark text-white"
                disabled={addCollaboratorMutation.isPending}
              />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'viewer' | 'editor')}
                className="px-3 py-2 bg-surface-elevated border border-border-dark rounded-md text-white text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <Button
                onClick={handleAddCollaborator}
                disabled={!searchQuery.trim() || addCollaboratorMutation.isPending}
                className="gap-2"
              >
                <UserPlus size={16} />
                Invite
              </Button>
            </div>
            {addCollaboratorMutation.isError && (
              <div className="text-sm text-red-400">{(addCollaboratorMutation.error as Error).message}</div>
            )}
          </div>

          <div className="space-y-2">
            {collaborators.length === 0 ? (
              <div className="text-sm text-on-muted text-center py-4">No collaborators yet</div>
            ) : (
              collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-3 bg-surface-elevated rounded-md"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{collaborator.username}</p>
                    <p className="text-xs text-on-muted">{collaborator.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <select
                        value={collaborator.role}
                        onChange={(e) =>
                          updateRoleMutation.mutate({
                            collaboratorId: collaborator.id,
                            role: e.target.value as 'viewer' | 'editor',
                          })
                        }
                        disabled={updateRoleMutation.isPending}
                        className="px-2 py-1 bg-surface-input border border-border-dark rounded text-white text-xs appearance-none pr-6"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-on-muted" />
                    </div>
                    <button
                      onClick={() => removeCollaboratorMutation.mutate(collaborator.id)}
                      disabled={removeCollaboratorMutation.isPending}
                      className="p-1 rounded text-on-muted hover:text-red-400 hover:bg-red-400/10 transition"
                      title="Remove collaborator"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
