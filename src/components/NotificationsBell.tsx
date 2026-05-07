// Bell shows: pending approvals + (for admin) expiring/expired IDs, stickers, permits.
import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestContext';
import { useVehicleStickers } from '@/contexts/VehicleStickerContext';
import { usePermits } from '@/contexts/PermitsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IDCardRequest } from '@/types';
import { collectExpiryItems, ExpiryItem } from '@/lib/expiryAggregator';
import { expiryLabel, expiryBadgeClasses } from '@/lib/expiryStatus';

export default function NotificationsBell() {
  const { currentUser } = useAuth();
  const { requests } = useRequests();
  const { stickers } = useVehicleStickers();
  const { permits } = usePermits();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'approvals' | 'expiry'>('approvals');
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (!currentUser) return [];
    const saved = localStorage.getItem(`farabi_read_notifications_${currentUser.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const isAdmin = currentUser?.role === 'admin';

  const pendingForMe = useMemo<IDCardRequest[]>(() => {
    if (!currentUser) return [];
    const { systemRole, canApproveDepartments, role } = currentUser;
    return requests.filter(r => {
      if (r.status === 'pending_dept_approval') {
        if (systemRole === 'hr_manager' && r.employeeType === 'direct') return true;
        if (
          (systemRole === 'dept_manager' || systemRole === 'hr_manager' || systemRole === 'ehss_manager' || systemRole === 'security_chief') &&
          r.employeeType === 'contractor' &&
          canApproveDepartments?.includes(r.departmentId)
        ) return true;
        return false;
      }
      if (r.status === 'pending_safety_approval') return systemRole === 'safety_orientation' || systemRole === 'ehss_manager';
      if (r.status === 'pending_id_review') return systemRole === 'id_card_executor' || systemRole === 'security_chief' || role === 'admin';
      return false;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [requests, currentUser]);

  const expiryItems = useMemo<ExpiryItem[]>(() => {
    if (!isAdmin) return [];
    return collectExpiryItems({ requests, stickers, permits, language });
  }, [requests, stickers, permits, language, isAdmin]);

  const expiredCount = expiryItems.filter(i => i.info.status === 'expired').length;
  const expiringCount = expiryItems.filter(i => i.info.status === 'expiring').length;
  const unreadApprovals = pendingForMe.filter(r => !readIds.includes(r.id)).length;
  const unreadExpiry = expiryItems.filter(i => !readIds.includes(`exp:${i.kind}:${i.id}`)).length;
  const totalUnread = unreadApprovals + unreadExpiry;

  const prevUnreadRef = useRef<number>(totalUnread);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) { initializedRef.current = true; prevUnreadRef.current = totalUnread; return; }
    if (totalUnread > prevUnreadRef.current) {
      try {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const tone = (f: number, s: number, d: number) => {
            const osc = ctx.createOscillator(); const g = ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = f;
            g.gain.setValueAtTime(0, ctx.currentTime + s);
            g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + s + 0.02);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + s + d);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(ctx.currentTime + s); osc.stop(ctx.currentTime + s + d);
          };
          tone(880, 0, 0.18); tone(1320, 0.12, 0.22);
          setTimeout(() => ctx.close().catch(() => {}), 600);
        }
      } catch {}
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(`farabi_read_notifications_${currentUser.id}`, JSON.stringify(readIds));
  }, [readIds, currentUser]);

  const markAllRead = () => {
    setReadIds([
      ...pendingForMe.map(r => r.id),
      ...expiryItems.map(i => `exp:${i.kind}:${i.id}`),
    ]);
  };

  const handleApprovalClick = (req: IDCardRequest) => {
    if (!readIds.includes(req.id)) setReadIds(p => [...p, req.id]);
    setOpen(false); navigate(`/request/${req.id}`);
  };

  const handleExpiryClick = (item: ExpiryItem) => {
    const key = `exp:${item.kind}:${item.id}`;
    if (!readIds.includes(key)) setReadIds(p => [...p, key]);
    setOpen(false); navigate(item.link);
  };

  const stageLabel = (s: string) => {
    if (language === 'ar') {
      if (s === 'pending_dept_approval') return 'بانتظار موافقة مدير القسم';
      if (s === 'pending_safety_approval') return 'بانتظار موافقة فريق السلامة';
      if (s === 'pending_id_review') return 'بانتظار مراجعة قسم بطاقات الهوية';
    } else {
      if (s === 'pending_dept_approval') return 'Awaiting Dept. Manager';
      if (s === 'pending_safety_approval') return 'Awaiting Safety Team';
      if (s === 'pending_id_review') return 'Awaiting ID Card Review';
    }
    return s;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className={`absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse ${expiredCount > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'}`}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={language === 'ar' ? 'start' : 'end'} className="w-[400px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
          {totalUnread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7 gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all read'}
            </Button>
          )}
        </div>

        {isAdmin && (
          <div className="flex border-b border-border bg-card">
            <button
              onClick={() => setTab('approvals')}
              className={`flex-1 text-xs py-2 font-medium transition-colors ${tab === 'approvals' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {language === 'ar' ? `موافقات (${pendingForMe.length})` : `Approvals (${pendingForMe.length})`}
            </button>
            <button
              onClick={() => setTab('expiry')}
              className={`flex-1 text-xs py-2 font-medium transition-colors flex items-center justify-center gap-1 ${tab === 'expiry' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {expiredCount > 0 && <AlertCircle className="w-3 h-3 text-destructive" />}
              {language === 'ar' ? `الصلاحية (${expiryItems.length})` : `Expiry (${expiryItems.length})`}
            </button>
          </div>
        )}

        <ScrollArea className="max-h-[420px]">
          {(!isAdmin || tab === 'approvals') ? (
            pendingForMe.length === 0 ? (
              <Empty isAr={language === 'ar'} kind="approvals" />
            ) : (
              <ul className="divide-y divide-border">
                {pendingForMe.map(req => {
                  const isUnread = !readIds.includes(req.id);
                  return (
                    <li key={req.id}>
                      <button onClick={() => handleApprovalClick(req)} className={`w-full text-start px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 ${isUnread ? 'bg-primary/5' : ''}`}>
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isUnread ? 'bg-primary' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-bold text-primary truncate">{req.requestNumber}</span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{new Date(req.updatedAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')}</span>
                          </div>
                          <p className="text-sm text-foreground font-medium truncate mt-0.5">{language === 'ar' ? req.nameAr : req.nameEn}</p>
                          <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning font-medium">{stageLabel(req.status)}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            expiryItems.length === 0 ? (
              <Empty isAr={language === 'ar'} kind="expiry" />
            ) : (
              <ul className="divide-y divide-border">
                {expiryItems.map(item => {
                  const key = `exp:${item.kind}:${item.id}`;
                  const isUnread = !readIds.includes(key);
                  const Icon = item.info.status === 'expired' ? AlertCircle : AlertTriangle;
                  return (
                    <li key={key}>
                      <button onClick={() => handleExpiryClick(item)} className={`w-full text-start px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 ${isUnread ? 'bg-primary/5' : ''}`}>
                        <Icon className={`mt-1 w-4 h-4 flex-shrink-0 ${item.info.status === 'expired' ? 'text-destructive' : 'text-orange-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-bold text-primary truncate">{item.requestNumber}</span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.expiryDate}</span>
                          </div>
                          <p className="text-sm text-foreground font-medium truncate mt-0.5">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                          <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${expiryBadgeClasses(item.info.status)}`}>
                            {expiryLabel(item.info, language)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function Empty({ isAr, kind }: { isAr: boolean; kind: 'approvals' | 'expiry' }) {
  return (
    <div className="px-4 py-12 text-center">
      <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground">
        {kind === 'approvals'
          ? (isAr ? 'لا توجد إشعارات جديدة' : 'No new notifications')
          : (isAr ? 'لا توجد عناصر منتهية أو قريبة الانتهاء' : 'No expiring or expired items')}
      </p>
    </div>
  );
}
