import { Image } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';

// Built from wirduk-logo/ by `npm run branding:build`.
const LOGOS = {
  small: {
    light: require('../../assets/branding/logo-light-small.png') as number,
    dark: require('../../assets/branding/logo-dark-small.png') as number,
  },
  large: {
    light: require('../../assets/branding/logo-light.png') as number,
    dark: require('../../assets/branding/logo-dark.png') as number,
  },
};

interface Props {
  /** Width and height in dp. Up to 48 uses the small file, larger the big one. */
  size: number;
}

/** The round app logo, in the light or dark version to match the theme. */
export function Logo({ size }: Props) {
  const { scheme } = useAppTheme();
  return (
    <Image
      source={LOGOS[size <= 48 ? 'small' : 'large'][scheme]}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
