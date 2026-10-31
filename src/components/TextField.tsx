import { StyleSheet, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

import { useDirection } from '@/i18n/direction';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  /** Text style override, e.g. the dhikr font for dhikr text. */
  inputStyle?: TextStyle;
}

/** A labelled input with an error line below it. */
export function TextField({ label, error, inputStyle, multiline, ...rest }: Props) {
  const { colors, radii, spacing } = useAppTheme();
  const { isRtl } = useDirection();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <TextInput
        {...rest}
        multiline={multiline}
        accessibilityLabel={rest.accessibilityLabel ?? label}
        placeholderTextColor={colors.textFaint}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            textAlign: isRtl ? 'right' : 'left',
            writingDirection: isRtl ? 'rtl' : 'ltr',
            minHeight: multiline ? 96 : 48,
          },
          inputStyle,
        ]}
      />
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, fontFamily: UI_FONTS.regular, fontSize: 16 },
});
