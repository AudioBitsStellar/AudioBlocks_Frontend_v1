import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card container component for grouping related content. Provides consistent styling and spacing.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-96 p-6">
      <h3 className="text-lg font-semibold mb-2">Card Title</h3>
      <p className="text-gray-600 mb-4">This is a basic card with some content inside.</p>
      <Button>Action</Button>
    </Card>
  ),
};

export const WithHeader: Story = {
  render: () => (
    <Card className="w-96 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-24"></div>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-2">Featured Card</h3>
        <p className="text-gray-600">Cards can include various content types.</p>
      </div>
    </Card>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card className="w-96 p-6 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Interactive Card</h3>
        <p className="text-sm text-gray-500">Hover me for effect</p>
      </div>
      <p className="text-gray-600">This card responds to hover interactions.</p>
    </Card>
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-6">
          <h4 className="font-semibold mb-2">Card {i}</h4>
          <p className="text-sm text-gray-600">Sample content</p>
        </Card>
      ))}
    </div>
  ),
};
