import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFormState } from '@/hooks/useFormState';

// Dummy component to test the hook
function TestForm() {
  const { values, handleChange, handleBlur, isFormValid, fieldError, setAllTouched } = useFormState(
    {
      displayName: '',
      bio: '',
      website: '',
      twitter: '',
    }
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setAllTouched();
      }}
    >
      <div>
        <label htmlFor="displayName">Name</label>
        <input
          id="displayName"
          value={values.displayName}
          onBlur={() => handleBlur('displayName')}
          onChange={(e) => handleChange('displayName', e.target.value)}
        />
        {fieldError('displayName') && (
          <span data-testid="error-displayName">{fieldError('displayName')}</span>
        )}
      </div>
      <div>
        <label htmlFor="bio">Bio</label>
        <input
          id="bio"
          value={values.bio}
          onBlur={() => handleBlur('bio')}
          onChange={(e) => handleChange('bio', e.target.value)}
        />
        {fieldError('bio') && <span data-testid="error-bio">{fieldError('bio')}</span>}
      </div>
      <div>
        <label htmlFor="website">Website</label>
        <input
          id="website"
          value={values.website}
          onBlur={() => handleBlur('website')}
          onChange={(e) => handleChange('website', e.target.value)}
        />
        {fieldError('website') && <span data-testid="error-website">{fieldError('website')}</span>}
      </div>
      <div>
        <label htmlFor="twitter">Twitter</label>
        <input
          id="twitter"
          value={values.twitter}
          onBlur={() => handleBlur('twitter')}
          onChange={(e) => handleChange('twitter', e.target.value)}
        />
        {fieldError('twitter') && <span data-testid="error-twitter">{fieldError('twitter')}</span>}
      </div>
      <button disabled={!isFormValid} type="submit">
        Submit
      </button>
    </form>
  );
}

function SubmitForm({ onSubmit }: { onSubmit: () => Promise<void> }) {
  const { values, handleChange, isSubmitting, submit } = useFormState({
    displayName: '',
    bio: '',
    website: '',
    twitter: '',
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(onSubmit).catch(() => {});
      }}
    >
      <label htmlFor="name">Name</label>
      <input
        id="name"
        value={values.displayName}
        onChange={(e) => handleChange('displayName', e.target.value)}
      />
      <button disabled={isSubmitting} type="submit">
        Save
      </button>
    </form>
  );
}

describe('useFormState validation', () => {
  it('Empty name shows "Name is required" error after blur or submit', () => {
    render(<TestForm />);
    const nameInput = screen.getByLabelText('Name');

    // Initial state has no errors visible
    expect(screen.queryByTestId('error-displayName')).toBeNull();

    // Blur without typing
    fireEvent.blur(nameInput);
    expect(screen.getByTestId('error-displayName').textContent).toBe('Name is required');
  });

  it('Bio over 500 chars shows limit error', () => {
    render(<TestForm />);
    const bioInput = screen.getByLabelText('Bio');

    // Type 501 characters
    const longBio = 'a'.repeat(501);
    fireEvent.change(bioInput, { target: { value: longBio } });
    fireEvent.blur(bioInput);

    expect(screen.getByTestId('error-bio').textContent).toBe(
      'Bio must be 500 characters or fewer.'
    );
  });

  it('Invalid URL shows format error', () => {
    render(<TestForm />);
    const websiteInput = screen.getByLabelText('Website');

    fireEvent.change(websiteInput, { target: { value: 'invalid-url' } });
    fireEvent.blur(websiteInput);

    expect(screen.getByTestId('error-website').textContent).toBe(
      'Enter a valid URL starting with http:// or https://'
    );
  });

  it.each([
    'javascript:alert(1)',
    'https://user:password@example.com',
    'https://',
    ' https://example.com',
  ])('rejects unsafe or incomplete profile URLs: %s', (website) => {
    render(<TestForm />);
    const websiteInput = screen.getByLabelText('Website');

    fireEvent.change(websiteInput, { target: { value: website } });
    fireEvent.blur(websiteInput);

    expect(screen.getByTestId('error-website')).toBeInTheDocument();
  });

  it('Valid form submits successfully (button enabled)', () => {
    render(<TestForm />);
    const nameInput = screen.getByLabelText('Name');
    const submitBtn = screen.getByRole('button', { name: 'Submit' });

    // Initially disabled because name is empty
    expect(submitBtn).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

    // Now should be enabled
    expect(submitBtn).not.toBeDisabled();
  });

  it('Error messages clear when field is corrected', () => {
    render(<TestForm />);
    const websiteInput = screen.getByLabelText('Website');

    // Cause an error
    fireEvent.change(websiteInput, { target: { value: 'invalid-url' } });
    fireEvent.blur(websiteInput);
    expect(screen.getByTestId('error-website')).toBeInTheDocument();

    // Correct the field
    fireEvent.change(websiteInput, { target: { value: 'https://example.com' } });

    // Error should clear
    expect(screen.queryByTestId('error-website')).toBeNull();
  });

  it('Submit button disabled during submission and re-enabled after', async () => {
    let resolve!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<SubmitForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Valid Name' } });
    const saveBtn = screen.getByRole('button', { name: 'Save' });

    fireEvent.click(saveBtn);
    await waitFor(() => expect(saveBtn).toBeDisabled());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Valid Name' }));

    resolve();
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
  });

  it('Invalid form does not call onSubmit', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    render(<SubmitForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });
});
