import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicleStickers } from '@/contexts/VehicleStickerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import StickerTable from './StickerTable';

export default function MyStickersPage() {
  const { currentUser } = useAuth();
  const { stickers } = useVehicleStickers();
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const mine = useMemo(
    () => stickers.filter(s => s.createdBy === currentUser?.id).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [stickers, currentUser]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('طلبات الملصقات الخاصة بي', 'My Sticker Requests')}
        </h1>
        <p className="text-sm text-muted-foreground">{mine.length} {t('طلب', 'request(s)')}</p>
      </div>
      <StickerTable stickers={mine} emptyText={t('لم تقم بتقديم أي طلب ملصق بعد', 'You have no sticker requests yet')} />
    </div>
  );
}
