/**
 * Test-only: the app's own dialog (`components/ui/Dialog.tsx`), read and pressed like a user.
 */
import { fireEvent, screen, within } from '@testing-library/react-native';

/** The open dialog (fails when none is open). */
export function openDialog() {
  return within(screen.getByTestId('dialog'));
}

/** The labels of the open dialog's buttons, top to bottom. */
export function dialogButtons(): string[] {
  return openDialog()
    .getAllByRole('button')
    .map((b) => String(within(b).getByText(/./).props.children));
}

/** Presses a button of the open dialog by its label. */
export async function pressInDialog(label: string): Promise<void> {
  await fireEvent.press(openDialog().getByRole('button', { name: label }));
}

/** Closes the open dialog without a choice (a tap outside it). */
export async function dismissDialog(): Promise<void> {
  await fireEvent.press(screen.getByTestId('dialog-scrim', { includeHiddenElements: true }));
}
