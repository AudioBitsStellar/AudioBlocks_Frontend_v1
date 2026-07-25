# Stories

This directory contains Storybook stories for UI components. Stories are interactive documentation that show component variants and usage examples.

## Structure

```
stories/
├── Button.stories.tsx       # Button component stories
├── Card.stories.tsx         # Card component stories
├── Badge.stories.tsx        # Badge component stories
├── Input.stories.tsx        # Input component stories
├── Pagination.stories.tsx   # Pagination component stories
├── Separator.stories.tsx    # Separator component stories
├── Skeleton.stories.tsx     # Skeleton component stories
└── Tooltip.stories.tsx      # Tooltip component stories
```

## Adding New Stories

1. Create a new file: `ComponentName.stories.tsx`
2. Import the component and Storybook types
3. Define the Meta configuration
4. Export story variations

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from '@/components/MyComponent';

const meta = {
  title: 'Category/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { /* default props */ },
};

export const Variant: Story = {
  args: { /* variant props */ },
};
```

## Viewing Stories

Start Storybook to view all stories:

```bash
npm run storybook
```

Then visit `http://localhost:6006`

## Guidelines

- **One story per variant** - Show each meaningful prop combination
- **Clear naming** - Use descriptive names like `Primary`, `Disabled`, not `Story1`
- **Include all props** - Show how components respond to different prop combinations
- **Document usage** - Add comments explaining when to use each variant
- **Keep it simple** - Avoid complex nested components in basic stories

## Documentation

For detailed instructions on writing and organizing stories, see [docs/STORYBOOK.md](../docs/STORYBOOK.md)
