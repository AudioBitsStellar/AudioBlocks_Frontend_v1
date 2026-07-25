# Storybook Documentation

This guide explains how to use Storybook in the AudioBlocks project for developing and documenting UI components.

## Getting Started

### Starting Storybook

```bash
npm run storybook
```

This starts Storybook on `http://localhost:6006`. The interface will automatically reload when you make changes to stories.

### Building Storybook for Production

```bash
npm run build-storybook
```

This creates a static build in `storybook-static/` that can be deployed to GitHub Pages or other hosting.

## Writing Stories

Stories live in the `/stories` directory and document individual components with different prop combinations.

### Basic Story Structure

```typescript
// stories/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';

// Configure the story
const meta = {
  title: 'UI/Button',        // Navigation path in Storybook
  component: Button,         // Component to document
  parameters: {
    layout: 'centered',      // How to display the story
  },
  tags: ['autodocs'],        // Enable auto-generated docs
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
      description: 'Button style variant',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Define a story
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};
```

### Story Types

#### Args (Props) Stories

Document component variants through props:

```typescript
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};
```

#### Render Stories

Complex stories with custom rendering:

```typescript
export const WithIcon: Story = {
  render: () => (
    <Button>
      <span>🎵</span> Play Music
    </Button>
  ),
};
```

#### Interaction Stories

Stories with user interactions:

```typescript
import { userEvent, within } from '@storybook/test';

export const Clickable: Story = {
  render: () => <Button onClick={() => alert('Clicked!')}>Click</Button>,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await userEvent.click(button);
  },
};
```

## Controls Panel

Storybook's Controls panel lets you interactively change component props. Configure controls via `argTypes`:

```typescript
argTypes: {
  size: {
    control: { type: 'select' },
    options: ['sm', 'md', 'lg'],
    description: 'Button size',
  },
  disabled: {
    control: 'boolean',
    description: 'Disable the button',
  },
  count: {
    control: { type: 'number', min: 0, max: 100, step: 5 },
    description: 'Item count',
  },
  onClick: {
    action: 'clicked',
    description: 'Button click handler',
  },
}
```

## Documentation

### Auto-Generated Docs

With `tags: ['autodocs']`, Storybook generates docs from JSDoc comments:

```typescript
interface ButtonProps {
  /** Visual style of the button */
  variant?: 'primary' | 'secondary';
  
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  
  /** Whether button is disabled */
  disabled?: boolean;
  
  /** Button text or icon */
  children: React.ReactNode;
}

export function Button({ variant = 'primary', ...props }: ButtonProps) {
  // ...
}
```

### Story Descriptions

Add descriptions to stories:

```typescript
const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'A versatile button component supporting multiple variants and sizes.',
      },
    },
  },
};

export const Primary: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The primary button variant used for main actions.',
      },
    },
  },
};
```

## Best Practices

### 1. Clear Story Names

Use descriptive names that indicate the variant:

```typescript
export const Primary = {};
export const Secondary = {};
export const Disabled = {};
export const Loading = {};
```

NOT: `export const Story1 = {}` ❌

### 2. Show All Variants

Create a story for each major variant:

```typescript
export const Default = { args: { variant: 'default' } };
export const Outline = { args: { variant: 'outline' } };
export const Ghost = { args: { variant: 'ghost' } };
export const Destructive = { args: { variant: 'destructive' } };
```

### 3. Document Usage Code

Include usage examples:

```typescript
export const Default: Story = {
  args: { children: 'Primary' },
  parameters: {
    docs: {
      source: {
        code: `
<Button variant="primary">
  Click me
</Button>
        `.trim(),
      },
    },
  },
};
```

### 4. Test Important Interactions

Use play functions for complex interactions:

```typescript
export const Modal: Story = {
  render: () => <Dialog open>Content</Dialog>,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await userEvent.click(button);
    await expect(within(canvasElement).getByText('Modal Content')).toBeInTheDocument();
  },
};
```

### 5. Use Responsive Layout

Show how components look on different screen sizes:

```typescript
export const Responsive: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
```

## Organizing Stories

Group related stories in the navigation:

```
UI/
  Button
  Card
  Input
  Badge
Layouts/
  Sidebar
  Header
  Footer
Pages/
  Dashboard
  Profile
  Settings
```

## Addons

### Essential Addons (Configured)

- **Docs** - Auto-generated documentation from JSDoc and stories
- **Controls** - Interactive prop manipulation
- **Interactions** - Test user interactions in stories
- **Actions** - Log component events

### Common Addon Usage

```typescript
// Log actions
parameters: {
  actions: {
    handles: ['click', 'change'],
  },
};

// Disable addon for specific story
parameters: {
  docs: { disable: true },
};
```

## Testing Stories

### Running Tests

```bash
# Run all Storybook tests
npm run test:storybook

# Run visual regression tests
npm run test:visual
```

### Testing Interactions

```typescript
export const Form: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');
    await userEvent.type(input, 'Hello');
    expect(input).toHaveValue('Hello');
  },
};
```

## Deployment

### GitHub Pages

Deploy Storybook to GitHub Pages via GitHub Actions:

```yaml
# .github/workflows/storybook.yml
name: Deploy Storybook

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build-storybook
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./storybook-static
```

## Tips & Tricks

### 1. Quick Navigation

Use Storybook's search (Ctrl/Cmd + P) to find stories quickly.

### 2. Link to Source Code

Click the source button to view component source in the editor.

### 3. Copy Code Snippets

Right-click any story to copy the code for use elsewhere.

### 4. Focus Mode

Click the expand icon to focus on a single story without navigation.

### 5. Dark Mode

Toggle dark mode via the theme icon in the toolbar.

## Common Issues

| Issue | Solution |
|-------|----------|
| Styles not showing | Import CSS in preview.ts |
| Props not updating | Check argTypes configuration |
| Stories not appearing | Verify file naming matches pattern (`*.stories.tsx`) |
| Components not importing | Check import paths relative to workspace root |

## Further Reading

- [Storybook Official Docs](https://storybook.js.org/docs)
- [Writing Stories](https://storybook.js.org/docs/react/writing-stories/introduction)
- [ComponentStory](https://storybook.js.org/docs/react/api/csf)
