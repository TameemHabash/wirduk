import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { useRepositories } from '@/data/DataProvider';
import { useSettings } from '@/data/settings/SettingsProvider';

import type { UserPlan } from './logic/types';
import { copyDefaultPlan, wardDhikrIds } from './logic/ward';
import { SetupLayout } from './SetupParts';
import { WardOrderPicker } from './WardOrderPicker';

/**
 * Setup 3 of 4 (owner, 2026-10-30): «ترتيب الورد», as in «أدومها»'s settings,
 * with the ward of the step chosen on setup 2, all of it shown first. The
 * choice is saved at once (the same setting as in «أدومها»'s settings).
 */
export function SetupOrderScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { content } = useRepositories();
  const { settings, update } = useSettings();
  const params = useLocalSearchParams<{ step?: string }>();
  const step = Math.max(1, Math.floor(Number(params.step)) || 1);
  const [plan, setPlan] = useState<UserPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    content
      .getDefaultPlan(i18n.language)
      .then((p) => !cancelled && setPlan(copyDefaultPlan(p)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [content, i18n.language]);

  const ward = plan ? wardDhikrIds(plan, Math.min(step, plan.steps.length), 'morning') : [];

  return (
    <SetupLayout
      page={2}
      actions={
        <Button
          title={t('adwamuha.setup.next')}
          disabled={!plan}
          onPress={() =>
            router.push({ pathname: '/adwamuha/reminders', params: { step: String(step) } })
          }
        />
      }
    >
      <WardOrderPicker
        order={settings.wardOrder}
        onChange={(order) => void update('wardOrder', order)}
        wardIds={ward}
        showAllFirst
      />
    </SetupLayout>
  );
}
