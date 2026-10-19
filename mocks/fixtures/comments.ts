import { mockSongsFixture } from './songs';
import { mockOwnProfileFixture } from './users';

/** Comment views (AudioBlock_Backend `CommentService.toView`). */
export interface MockComment {
  id: string;
  songId: string;
  userId: string;
  text: string;
  parentId: string | null;
  depth: number;
  edited: boolean;
  replyCount: number;
  author: { id: string; username: string; name: string; profileImage: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

const author = {
  id: mockOwnProfileFixture.id,
  username: mockOwnProfileFixture.username,
  name: mockOwnProfileFixture.name,
  profileImage: mockOwnProfileFixture.profileImage,
};

export const mockCommentsFixture: MockComment[] = [
  {
    id: '2a7f9e80-0000-4000-8000-000000000001',
    songId: mockSongsFixture[0].id,
    userId: author.id,
    text: 'This one is on repeat all week.',
    parentId: null,
    depth: 0,
    edited: false,
    replyCount: 0,
    author,
    createdAt: '2025-03-16T08:00:00.000Z',
    updatedAt: '2025-03-16T08:00:00.000Z',
  },
];
