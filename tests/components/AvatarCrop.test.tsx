import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AvatarCrop from '@/components/common/dashboard/AvatarCrop';

const drawImage = vi.fn();

class FakeImage {
  naturalWidth = 500;
  naturalHeight = 500;
  crossOrigin = '';
  onload: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  drawImage.mockClear();
  vi.stubGlobal('Image', FakeImage);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    drawImage,
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** x/y the image is currently drawn at; the frame is 250px and the image is square. */
const lastDraw = () => {
  const [, x, y, w, h] = drawImage.mock.calls.at(-1)!;
  return { x, y, w, h };
};

async function renderCrop() {
  const onCropComplete = vi.fn();
  render(
    <AvatarCrop
      open
      imageSrc="data:image/png;base64,AAAA"
      onCropComplete={onCropComplete}
      onOpenChange={vi.fn()}
    />
  );
  // Let the (fake) image load and the first draw happen.
  await screen.findByRole('group', { name: 'Avatar crop area' });
  await Promise.resolve();
  return { area: screen.getByRole('group', { name: 'Avatar crop area' }), onCropComplete };
}

describe('AvatarCrop keyboard support (#754)', () => {
  it('makes the crop area focusable and described by its instructions', async () => {
    const { area } = await renderCrop();

    expect(area).toHaveAttribute('tabindex', '0');
    const describedBy = area.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)).toHaveTextContent(/arrow keys/i);
    expect(document.getElementById(describedBy)).toHaveTextContent(/plus and minus to zoom/i);
  });

  it('zooms with + and - and resets with 0', async () => {
    const { area } = await renderCrop();

    fireEvent.keyDown(area, { key: '+' });
    fireEvent.keyDown(area, { key: '+' });
    expect(screen.getByText('150%')).toBeInTheDocument();

    fireEvent.keyDown(area, { key: '-' });
    expect(screen.getByText('125%')).toBeInTheDocument();

    fireEvent.keyDown(area, { key: '0' });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('pans 1px per arrow press and 10px with Shift', async () => {
    const { area } = await renderCrop();
    fireEvent.keyDown(area, { key: '+' });
    fireEvent.keyDown(area, { key: '+' }); // 150% -> 375px image, so 62.5px of room each side
    const origin = lastDraw();

    fireEvent.keyDown(area, { key: 'ArrowRight' });
    expect(lastDraw().x).toBe(origin.x + 1);

    fireEvent.keyDown(area, { key: 'ArrowDown', shiftKey: true });
    expect(lastDraw().y).toBe(origin.y + 10);

    fireEvent.keyDown(area, { key: 'ArrowLeft' });
    fireEvent.keyDown(area, { key: 'ArrowUp', shiftKey: true });
    expect(lastDraw()).toMatchObject({ x: origin.x, y: origin.y });
  });

  it('clamps panning so the image keeps covering the frame', async () => {
    const { area } = await renderCrop();
    fireEvent.keyDown(area, { key: '+' });
    fireEvent.keyDown(area, { key: '+' });
    const origin = lastDraw();

    for (let i = 0; i < 20; i += 1) fireEvent.keyDown(area, { key: 'ArrowLeft', shiftKey: true });

    // 62.5px of room: the image's right edge stops at the frame's right edge.
    expect(lastDraw().x).toBe(origin.x - 62.5);
  });

  it('cannot pan at 100% zoom of a square image', async () => {
    const { area } = await renderCrop();
    const origin = lastDraw();

    fireEvent.keyDown(area, { key: 'ArrowRight', shiftKey: true });

    expect(lastDraw()).toMatchObject({ x: origin.x, y: origin.y });
  });

  it('offers visible pan buttons as a non-drag alternative', async () => {
    const { area } = await renderCrop();
    fireEvent.keyDown(area, { key: '+' });
    fireEvent.keyDown(area, { key: '+' });
    const origin = lastDraw();

    fireEvent.click(screen.getByRole('button', { name: 'Move image right' }));
    expect(lastDraw().x).toBe(origin.x + 10);

    fireEvent.click(screen.getByRole('button', { name: 'Move image up' }));
    expect(lastDraw().y).toBe(origin.y - 10);

    fireEvent.click(screen.getByRole('button', { name: 'Reset position and zoom' }));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('ignores unrelated keys so Tab and Escape keep working', async () => {
    const { area } = await renderCrop();
    const calls = drawImage.mock.calls.length;

    const notPrevented = fireEvent.keyDown(area, { key: 'Tab' });

    expect(notPrevented).toBe(true);
    expect(drawImage.mock.calls.length).toBe(calls);
  });
});
