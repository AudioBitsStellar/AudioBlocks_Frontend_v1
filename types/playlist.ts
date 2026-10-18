export interface PlaylistCollaborator {
  id: string;
  username: string;
  role: 'viewer' | 'editor';
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  owner: {
    id: string;
    username: string;
  };
  collaborators: PlaylistCollaborator[];
  songs: Array<{
    id: string;
    title: string;
    artist: string;
    cover?: string;
    addedBy: {
      id: string;
      username: string;
    };
  }>;
  isSharedWithMe?: boolean;
  createdAt: string;
  updatedAt: string;
}
