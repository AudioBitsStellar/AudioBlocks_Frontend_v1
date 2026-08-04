import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A pagination component for navigating between pages. Includes previous/next buttons and page number indicators.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Pagination>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline">
          Previous
        </Button>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((page) => (
            <Button key={page} size="sm" variant={page === 1 ? 'default' : 'outline'}>
              {page}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline">
          Next
        </Button>
      </div>
    </Pagination>
  ),
};

export const WithEllipsis: Story = {
  render: () => (
    <Pagination>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline">
          Previous
        </Button>
        <Button size="sm" variant="default">
          1
        </Button>
        <Button size="sm" variant="outline">
          2
        </Button>
        <span className="px-2">...</span>
        <Button size="sm" variant="outline">
          98
        </Button>
        <Button size="sm" variant="outline">
          99
        </Button>
        <Button size="sm" variant="outline">
          100
        </Button>
        <Button size="sm" variant="outline">
          Next
        </Button>
      </div>
    </Pagination>
  ),
};

export const FirstPage: Story = {
  render: () => (
    <Pagination>
      <div className="flex items-center gap-2">
        <Button disabled size="sm" variant="outline">
          Previous
        </Button>
        <Button size="sm" variant="default">
          1
        </Button>
        <Button size="sm" variant="outline">
          2
        </Button>
        <Button size="sm" variant="outline">
          3
        </Button>
        <Button size="sm" variant="outline">
          Next
        </Button>
      </div>
    </Pagination>
  ),
};

export const LastPage: Story = {
  render: () => (
    <Pagination>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline">
          Previous
        </Button>
        <Button size="sm" variant="outline">
          98
        </Button>
        <Button size="sm" variant="outline">
          99
        </Button>
        <Button size="sm" variant="default">
          100
        </Button>
        <Button disabled size="sm" variant="outline">
          Next
        </Button>
      </div>
    </Pagination>
  ),
};
