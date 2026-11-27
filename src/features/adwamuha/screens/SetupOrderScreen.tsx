import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { useRepositories } from '@/data/DataProvider';
import type { UserPlan } from '@/data/models';
import { useSettings } from '@/data/settings/SettingsProvider';
import { SetupLayout } from '@/features/adwamuha/components/SetupParts';
import { WardOrderPicker } from '@/features/adwamuha/components/WardOrderPicker';
import { copyDefaultPlan, wardDhikrIds } from '@/features/adwamuha/logic/ward';
import { useAsync } from '@/hooks/useAsync';

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
  const plan = useAsync<UserPlan | null>(
    () => content.getDefaultPlan(i18n.language).then(copyDefaultPlan),
    [content, i18n.language],
    null,
  );

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
