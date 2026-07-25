import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A pagination component for navigating between pages. Includes previous/next buttons and page number indicators.',
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
        <Button variant="outline" size="sm">Previous</Button>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((page) => (
            <Button key={page} variant={page === 1 ? 'default' : 'outline'} size="sm">
              {page}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm">Next</Button>
      </div>
    </Pagination>
  ),
};

export const WithEllipsis: Story = {
  render: () => (
    <Pagination>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">Previous</Button>
        <Button variant="default" size="sm">1</Button>
        <Button variant="outline" size="sm">2</Button>
        <span className="px-2">...</span>
        <Button variant="outline" size="sm">98</Button>
        <Button variant="outline" size="sm">99</Button>
        <Button variant="outline" size="sm">100</Button>
        <Button variant="outline" size="sm">Next</Button>
      </div>
    </Pagination>
  ),
};

export const FirstPage: Story = {
  render: () => (
    <Pagination>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>Previous</Button>
        <Button variant="default" size="sm">1</Button>
        <Button variant="outline" size="sm">2</Button>
        <Button variant="outline" size="sm">3</Button>
        <Button variant="outline" size="sm">Next</Button>
      </div>
    </Pagination>
  ),
};

export const LastPage: Story = {
  render: () => (
    <Pagination>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">Previous</Button>
        <Button variant="outline" size="sm">98</Button>
        <Button variant="outline" size="sm">99</Button>
        <Button variant="default" size="sm">100</Button>
        <Button variant="outline" size="sm" disabled>Next</Button>
      </div>
    </Pagination>
  ),
};
