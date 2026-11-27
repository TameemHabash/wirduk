import { StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '@/theme/ThemeProvider';
import { COLORS } from '@/theme/colors';
import { dialogButtons, dismissDialog, openDialog, pressInDialog } from '@/test-utils/dialog';

import { Button } from './Button';
import {
  DialogName,
  DialogProvider,
  NAME_MARK,
  aroundName,
  useDialog,
  type DialogOptions,
} from './Dialog';
import { tr } from '@/test-utils/tr';

function Opener({ options }: { options: DialogOptions }) {
  const dialog = useDialog();
  return <Button title="افتح" onPress={() => dialog.show(options)} />;
}

async function open(options: DialogOptions) {
  await render(
    <AppThemeProvider initialPreference="light">
      <DialogProvider>
        <Opener options={options} />
      </DialogProvider>
    </AppThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'افتح' }));
}

describe('Dialog', () => {
  it('shows the title, the text and the buttons, the action on top', async () => {
    await open({
      icon: 'trash',
      tone: 'danger',
      title: tr('custom.deleteDhikrConfirmTitle'),
      body: 'لا يمكن التراجع.',
      actions: [
        { label: tr('custom.delete'), kind: 'danger' },
        { label: tr('common.cancel'), cancel: true },
      ],
    });
    expect(
      openDialog().getByRole('header', { name: tr('custom.deleteDhikrConfirmTitle') }),
    ).toBeOnTheScreen();
    expect(openDialog().getByText('لا يمكن التراجع.')).toBeOnTheScreen();
    expect(dialogButtons()).toEqual([tr('custom.delete'), tr('common.cancel')]);
  });

  it('runs the chosen action once and closes', async () => {
    const remove = jest.fn();
    const cancel = jest.fn();
    await open({
      icon: 'trash',
      title: 'حذف؟',
      actions: [
        { label: tr('custom.delete'), kind: 'danger', onPress: remove },
        { label: tr('common.cancel'), cancel: true, onPress: cancel },
      ],
    });
    await pressInDialog(tr('custom.delete'));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('a tap outside it runs the cancel action', async () => {
    const remove = jest.fn();
    const cancel = jest.fn();
    await open({
      icon: 'trash',
      title: 'حذف؟',
      actions: [
        { label: tr('custom.delete'), onPress: remove },
        { label: tr('common.cancel'), cancel: true, onPress: cancel },
      ],
    });
    await dismissDialog();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('a delete is filled red; "discard" can be red text on a quiet button', async () => {
    await open({
      icon: 'info',
      tone: 'gold',
      title: tr('custom.discardTitle'),
      actions: [
        { label: tr('custom.keepEditing'), cancel: true },
        { label: tr('custom.discard'), destructive: true },
        { label: tr('custom.delete'), kind: 'danger' },
      ],
    });
    const color = (label: string) =>
      StyleSheet.flatten(openDialog().getByText(label).props.style).color as string;
    expect(color(tr('custom.keepEditing'))).toBe(COLORS.light.onPrimary);
    expect(color(tr('custom.discard'))).toBe(COLORS.light.danger);
    expect(color(tr('custom.delete'))).toBe(COLORS.light.onDanger);
  });

  it('shows extra content between the text and the buttons', async () => {
    await open({
      icon: 'sprout',
      title: tr('adwamuha.plan.confirmTitle'),
      content: <Text>الحديث</Text>,
      actions: [{ label: 'أبقِ الخطة', cancel: true }],
    });
    expect(openDialog().getByText('الحديث')).toBeOnTheScreen();
  });

  it('a new dialog replaces the open one', async () => {
    function Two() {
      const dialog = useDialog();
      return (
        <Button
          title="افتح"
          onPress={() => {
            dialog.show({
              icon: 'info',
              title: 'الأول',
              actions: [{ label: tr('adwamuha.message.ok') }],
            });
            dialog.show({
              icon: 'info',
              title: 'الثاني',
              actions: [{ label: tr('adwamuha.message.ok') }],
            });
          }}
        />
      );
    }
    await render(
      <AppThemeProvider>
        <DialogProvider>
          <Two />
        </DialogProvider>
      </AppThemeProvider>,
    );
    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'افتح' })));
    expect(screen.getAllByTestId('dialog')).toHaveLength(1);
    expect(openDialog().getByText('الثاني')).toBeOnTheScreen();
    expect(openDialog().queryByText('الأول')).toBeNull();
  });

  it('draws a name inside the title in teal, without «»', async () => {
    const [before, after] = aroundName(`حذف ${NAME_MARK}؟`);
    expect([before, after]).toEqual(['حذف ', '؟']);
    expect(aroundName('بلا اسم')).toEqual(['بلا اسم', '']);
    await open({
      icon: 'trash',
      title: (
        <>
          {before}
          <DialogName>أدعيتي</DialogName>
          {after}
        </>
      ),
      actions: [{ label: tr('custom.delete') }],
    });
    expect(openDialog().getByText('حذف أدعيتي؟')).toBeOnTheScreen();
    expect(StyleSheet.flatten(openDialog().getByText('أدعيتي').props.style).color).toBe(
      COLORS.light.primaryInk,
    );
  });
});
