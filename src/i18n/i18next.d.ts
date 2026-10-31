import 'i18next';

import type { resources } from './resources';

// Typed translation keys: `t('home.title')` is checked at compile time.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['ar'];
  }
}
