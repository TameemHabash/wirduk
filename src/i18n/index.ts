// Hermes (the app's JS engine) has no Intl.PluralRules. Without it, i18next only
// knows "one" and "other", and Arabic needs six forms (zero, one, two, few, many,
// other). This polyfill installs itself only when Intl.PluralRules is missing.
import 'intl-pluralrules';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE } from './languages';
import { DEFAULT_NAMESPACE, resources } from './resources';

if (!i18n.isInitialized) {
  // `i18n.use(plugin)` is the documented i18next setup, not the named `use` export.
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: DEFAULT_NAMESPACE,
    ns: [DEFAULT_NAMESPACE],
    interpolation: { escapeValue: false },
    // Resources are bundled, so init can finish synchronously.
    initAsync: false,
  });
}

export default i18n;
