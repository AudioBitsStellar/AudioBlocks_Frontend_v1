import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from '@/components/ui/separator';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A horizontal or vertical separator line component for dividing content sections.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <div className="py-2">
        <h3 className="font-semibold">Section 1</h3>
        <p className="text-sm text-gray-600">Some content here</p>
      </div>
      <Separator />
      <div className="py-2">
        <h3 className="font-semibold">Section 2</h3>
        <p className="text-sm text-gray-600">More content here</p>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-20 items-center gap-4">
      <div>
        <p className="text-sm font-semibold">Left</p>
      </div>
      <Separator orientation="vertical" />
      <div>
        <p className="text-sm font-semibold">Right</p>
      </div>
    </div>
  ),
};

export const BetweenList: Story = {
  render: () => (
    <div className="w-full max-w-md">
      {['Item 1', 'Item 2', 'Item 3'].map((item, idx) => (
        <div key={item}>
          <p className="py-2 text-sm">{item}</p>
          {idx < 2 && <Separator />}
        </div>
      ))}
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-4">
      <div className="relative">
        <Separator />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-500">
          OR
        </div>
      </div>
    </div>
  ),
};
