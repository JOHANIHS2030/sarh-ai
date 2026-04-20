import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/contexts/RequestContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IDCardRequest } from '@/types';

export default function NotificationsBell() {
  const { currentUser } = useAuth();
  const { requests } = useRequests();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (!currentUser) return [];
    const saved = localStorage.getItem(`farabi_read_notifications_${currentUser.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Determine which requests this user can approve
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
      if (r.status === 'pending_safety_approval') {
        return systemRole === 'safety_orientation' || systemRole === 'ehss_manager';
      }
      if (r.status === 'pending_id_review') {
        return systemRole === 'id_card_executor' || systemRole === 'security_chief' || role === 'admin';
      }
      return false;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [requests, currentUser]);

  const unreadCount = pendingForMe.filter(r => !readIds.includes(r.id)).length;

  // Persist read state per user
  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(`farabi_read_notifications_${currentUser.id}`, JSON.stringify(readIds));
  }, [readIds, currentUser]);

  const handleOpen = (next: boolean) => {
    setOpen(next);
  };

  const markAllRead = () => {
    setReadIds(pendingForMe.map(r => r.id));
  };

  const handleClick = (req: IDCardRequest) => {
    if (!readIds.includes(req.id)) {
      setReadIds(prev => [...prev, req.id]);
    }
    setOpen(false);
    navigate(`/request/${req.id}`);
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
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={language === 'ar' ? 'start' : 'end'}
        className="w-[360px] p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {language === 'ar'
                ? `${pendingForMe.length} طلب بانتظار موافقتك`
                : `${pendingForMe.length} request${pendingForMe.length === 1 ? '' : 's'} awaiting your approval`}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7 gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all read'}
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {pendingForMe.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'لا توجد إشعارات جديدة' : 'No new notifications'}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {language === 'ar' ? 'سيتم إعلامك عند وصول طلب يتطلب موافقتك' : "You'll be notified when a request needs your approval"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pendingForMe.map(req => {
                const isUnread = !readIds.includes(req.id);
                return (
                  <li key={req.id}>
                    <button
                      onClick={() => handleClick(req)}
                      className={`w-full text-start px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 ${isUnread ? 'bg-primary/5' : ''}`}
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isUnread ? 'bg-primary' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-primary truncate">{req.requestNumber}</span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {new Date(req.updatedAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')}
                          </span>
                        </div>
                        <p className="text-sm text-foreground font-medium truncate mt-0.5">
                          {language === 'ar' ? req.nameAr : req.nameEn}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {t(req.employeeType === 'direct' ? 'directEmployee' : 'contractorEmployee')}
                        </p>
                        <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning font-medium">
                          {stageLabel(req.status)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {pendingForMe.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-muted/20">
            <button
              onClick={() => { setOpen(false); navigate('/pending-approvals'); }}
              className="w-full text-xs text-primary font-medium hover:underline py-1"
            >
              {language === 'ar' ? 'عرض جميع الموافقات المعلقة ←' : 'View all pending approvals →'}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
