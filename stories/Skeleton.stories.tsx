import { Skeleton } from '@/components/ui/skeleton';
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A skeleton loading component for displaying placeholder content while data is loading.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: 'w-12 h-12 rounded-full',
  },
};

export const Rectangle: Story = {
  args: {
    className: 'w-32 h-8 rounded',
  },
};

export const LoadingCard: Story = {
  render: () => (
    <div className="border rounded-lg p-4 w-80">
      <Skeleton className="w-12 h-12 rounded-full mb-4" />
      <Skeleton className="w-full h-4 mb-2" />
      <Skeleton className="w-full h-4 mb-4" />
      <Skeleton className="w-24 h-8" />
    </div>
  ),
};

export const LoadingTable: Story = {
  render: () => (
    <div className="space-y-3 w-80">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-12 h-12 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-3/4 h-4" />
            <Skeleton className="w-full h-3" />
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Avatar: Story = {
  render: () => (
    <div className="flex gap-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <Skeleton className="w-10 h-10 rounded-full" />
      <Skeleton className="w-10 h-10 rounded-full" />
    </div>
  ),
};
