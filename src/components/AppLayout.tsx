// Copyright © 2026. All rights reserved. Developed by: [Hani Salem Al-Johani] - Employee ID: [10594] - FYPC Industrial Security Dept.
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard, FilePlus, FileText, CheckSquare, LogOut, Globe, Shield,
  ChevronLeft, ChevronRight, ChevronDown, Menu, Users, Building2, Activity, GitBranch, Settings, ExternalLink, Wand2, Car, IdCard, Wrench, ShieldCheck, BarChart3, Info, BookOpen, CalendarRange
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationsBell from '@/components/NotificationsBell';
import AppFooter from '@/components/AppFooter';
import AboutModal from '@/components/AboutModal';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { currentUser, logout } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const { settings: companySettings } = useCompany();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const location = useLocation();

  const isAdmin = currentUser?.role === 'admin';
  const isIdCardTeam = currentUser?.systemRole === 'id_card_executor' || currentUser?.systemRole === 'security_chief';
  const isSafety = currentUser?.systemRole === 'safety_orientation' || currentUser?.systemRole === 'ehss_manager';
  const isDeptManager = currentUser?.systemRole === 'dept_manager' || currentUser?.systemRole === 'hr_manager';
  const hasPermitAuthority = (currentUser?.permitAuthorities?.length || 0) > 0;
  const canApprovePermits = isDeptManager || hasPermitAuthority || isAdmin;

  type NavItem = { to: string; icon: typeof LayoutDashboard; label: string; show: boolean };
  type NavGroup = { id: string; icon: typeof LayoutDashboard; labelAr: string; labelEn: string; items: NavItem[]; show: boolean };

  const idCardItems: NavItem[] = [
    { to: '/new-request', icon: FilePlus, label: t('newRequest'), show: true },
    { to: '/my-requests', icon: FileText, label: t('myRequests'), show: true },
    { to: '/pending-approvals', icon: CheckSquare, label: t('pendingApprovals'), show: isDeptManager || isSafety || isIdCardTeam || isAdmin },
    { to: '/all-requests', icon: FileText, label: t('allRequests'), show: isAdmin || isIdCardTeam },
  ];

  const stickerItems: NavItem[] = [
    { to: '/stickers/new', icon: FilePlus, label: language === 'ar' ? 'طلب ملصق جديد' : 'New Sticker', show: true },
    { to: '/stickers/my', icon: Car, label: language === 'ar' ? 'ملصقاتي' : 'My Stickers', show: true },
    { to: '/stickers/pending', icon: CheckSquare, label: language === 'ar' ? 'موافقات الملصقات' : 'Sticker Approvals', show: isDeptManager || isIdCardTeam || isAdmin },
    { to: '/stickers/all', icon: FileText, label: language === 'ar' ? 'جميع الملصقات' : 'All Stickers', show: isAdmin || isIdCardTeam },
  ];

  const permitItems: NavItem[] = [
    { to: '/permits/new?type=mobile_phone', icon: FilePlus, label: language === 'ar' ? 'تصريح إدخال الجوال' : 'Mobile Phone Permit', show: true },
    { to: '/permits/new?type=laptop', icon: FilePlus, label: language === 'ar' ? 'تصريح الكمبيوتر المحمول' : 'Laptop Permit', show: true },
    { to: '/permits/new?type=photography', icon: FilePlus, label: language === 'ar' ? 'تصريح التصوير' : 'Photography Permit', show: true },
    { to: '/permits/my', icon: ShieldCheck, label: language === 'ar' ? 'تصاريحي' : 'My Permits', show: true },
    { to: '/permits/pending', icon: CheckSquare, label: language === 'ar' ? 'موافقات التصاريح' : 'Permit Approvals', show: canApprovePermits },
    { to: '/permits/all', icon: FileText, label: language === 'ar' ? 'جميع التصاريح' : 'All Permits', show: hasPermitAuthority || isAdmin },
  ];

  const adminItems: NavItem[] = [
    { to: '/workflow', icon: GitBranch, label: language === 'ar' ? 'سير العمل' : 'Workflow', show: true },
    { to: '/audit-log', icon: Activity, label: language === 'ar' ? 'سجل العمليات' : 'Audit Log', show: isAdmin },
    { to: '/builder', icon: Wand2, label: language === 'ar' ? 'منشئ النماذج والتقارير' : 'Forms & Reports Builder', show: isAdmin },
    { to: '/settings/users', icon: Users, label: t('users'), show: isAdmin },
    { to: '/settings/external-users', icon: ExternalLink, label: language === 'ar' ? 'مستخدمو الصفحات الخارجية' : 'External Users', show: isAdmin },
    { to: '/settings/departments', icon: Building2, label: t('departments'), show: isAdmin },
    { to: '/settings/company', icon: Settings, label: language === 'ar' ? 'إعدادات الشركة' : 'Company Settings', show: isAdmin },
  ];

  const reportsItems: NavItem[] = [
    { to: '/reports/idcards/all',      icon: FileText, label: language === 'ar' ? 'بطاقات الهوية — الكل' : 'ID Cards — All', show: isAdmin },
    { to: '/reports/idcards/issued',   icon: FileText, label: language === 'ar' ? 'بطاقات الهوية الصادرة' : 'ID Cards — Issued', show: isAdmin },
    { to: '/reports/idcards/pending',  icon: FileText, label: language === 'ar' ? 'بطاقات الهوية المعلقة' : 'ID Cards — On Hold', show: isAdmin },
    { to: '/reports/idcards/rejected', icon: FileText, label: language === 'ar' ? 'بطاقات الهوية المرفوضة' : 'ID Cards — Rejected', show: isAdmin },
    { to: '/reports/stickers/all',      icon: FileText, label: language === 'ar' ? 'ملصقات المركبات — الكل' : 'Stickers — All', show: isAdmin },
    { to: '/reports/stickers/issued',   icon: FileText, label: language === 'ar' ? 'ملصقات المركبات الصادرة' : 'Stickers — Issued', show: isAdmin },
    { to: '/reports/stickers/pending',  icon: FileText, label: language === 'ar' ? 'ملصقات المركبات المعلقة' : 'Stickers — On Hold', show: isAdmin },
    { to: '/reports/stickers/rejected', icon: FileText, label: language === 'ar' ? 'ملصقات المركبات المرفوضة' : 'Stickers — Rejected', show: isAdmin },
    { to: '/reports/mobile/all',      icon: FileText, label: language === 'ar' ? 'تصاريح الجوال — الكل' : 'Mobile — All', show: isAdmin },
    { to: '/reports/mobile/issued',   icon: FileText, label: language === 'ar' ? 'تصاريح الجوال الصادرة' : 'Mobile — Issued', show: isAdmin },
    { to: '/reports/mobile/pending',  icon: FileText, label: language === 'ar' ? 'تصاريح الجوال المعلقة' : 'Mobile — On Hold', show: isAdmin },
    { to: '/reports/mobile/rejected', icon: FileText, label: language === 'ar' ? 'تصاريح الجوال المرفوضة' : 'Mobile — Rejected', show: isAdmin },
    { to: '/reports/laptop/all',      icon: FileText, label: language === 'ar' ? 'تصاريح الكمبيوتر — الكل' : 'Laptop — All', show: isAdmin },
    { to: '/reports/laptop/issued',   icon: FileText, label: language === 'ar' ? 'تصاريح الكمبيوتر الصادرة' : 'Laptop — Issued', show: isAdmin },
    { to: '/reports/laptop/pending',  icon: FileText, label: language === 'ar' ? 'تصاريح الكمبيوتر المعلقة' : 'Laptop — On Hold', show: isAdmin },
    { to: '/reports/laptop/rejected', icon: FileText, label: language === 'ar' ? 'تصاريح الكمبيوتر المرفوضة' : 'Laptop — Rejected', show: isAdmin },
    { to: '/reports/photography/all',      icon: FileText, label: language === 'ar' ? 'تصاريح التصوير — الكل' : 'Photography — All', show: isAdmin },
    { to: '/reports/photography/issued',   icon: FileText, label: language === 'ar' ? 'تصاريح التصوير الصادرة' : 'Photography — Issued', show: isAdmin },
    { to: '/reports/photography/pending',  icon: FileText, label: language === 'ar' ? 'تصاريح التصوير المعلقة' : 'Photography — On Hold', show: isAdmin },
    { to: '/reports/photography/rejected', icon: FileText, label: language === 'ar' ? 'تصاريح التصوير المرفوضة' : 'Photography — Rejected', show: isAdmin },
  ];

  const groups: NavGroup[] = [
    {
      id: 'idcards',
      icon: IdCard,
      labelAr: 'نظام قسم بطاقات الهوية',
      labelEn: 'ID Card Section System',
      items: idCardItems.filter(i => i.show),
      show: idCardItems.some(i => i.show),
    },
    {
      id: 'stickers',
      icon: Car,
      labelAr: 'نظام ملصقات المركبات',
      labelEn: 'Vehicle Stickers System',
      items: stickerItems.filter(i => i.show),
      show: stickerItems.some(i => i.show),
    },
    {
      id: 'permits',
      icon: ShieldCheck,
      labelAr: 'نظام طلبات إصدار التصاريح',
      labelEn: 'Permit Issuance System',
      items: permitItems.filter(i => i.show),
      show: permitItems.some(i => i.show),
    },
    {
      id: 'reports',
      icon: BarChart3,
      labelAr: 'السجلات والتقارير',
      labelEn: 'Reports & Records',
      items: reportsItems.filter(i => i.show),
      show: isAdmin,
    },
    {
      id: 'admin',
      icon: Wrench,
      labelAr: 'الإدارة',
      labelEn: 'Administration',
      items: adminItems.filter(i => i.show),
      show: adminItems.some(i => i.show),
    },
  ];

  // Auto-open the group that contains the active route
  const activeGroupId =
    groups.find(g => g.items.some(i => location.pathname.startsWith(i.to) && i.to !== '/'))?.id || null;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach(g => { initial[g.id] = g.id === activeGroupId; });
    return initial;
  });

  // Keep active group open when route changes
  if (activeGroupId && !openGroups[activeGroupId]) {
    // Defer state update to avoid render loop
    setTimeout(() => setOpenGroups(p => ({ ...p, [activeGroupId]: true })), 0);
  }

  const toggleGroup = (id: string) => {
    setOpenGroups(p => ({ ...p, [id]: !p[id] }));
  };

  const externalUrl = `${window.location.origin}/external-form`;

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 flex flex-col fixed h-full z-30`}
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {companySettings.logo ? (
              <img src={companySettings.logo} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <Shield className="w-5 h-5 text-accent-foreground" />
            )}
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-sidebar-foreground truncate">{t('appTitle')}</h2>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">{t('appSubtitle')}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {/* Dashboard (always at the top, no group) */}
          <NavLink
            to="/"
            end
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors text-sm mb-2"
            activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="truncate">{t('dashboard')}</span>}
          </NavLink>

          {groups.filter(g => g.show).map(group => {
            const isOpen = openGroups[group.id];
            const GroupIcon = group.icon;
            const hasActive = group.items.some(i => location.pathname.startsWith(i.to));
            return (
              <div key={group.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => sidebarOpen ? toggleGroup(group.id) : setSidebarOpen(true)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                    hasActive
                      ? 'bg-sidebar-accent/60 text-sidebar-foreground font-semibold'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                  aria-expanded={isOpen}
                >
                  <GroupIcon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="truncate flex-1 text-start">
                        {language === 'ar' ? group.labelAr : group.labelEn}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                </button>
                {sidebarOpen && isOpen && (
                  <div className="mt-1 ms-3 ps-3 border-s border-sidebar-border/40 space-y-0.5">
                    {group.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors text-sm"
                        activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors w-full text-sm"
            title={externalUrl}
          >
            <ExternalLink className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="truncate">{language === 'ar' ? 'النموذج الخارجي' : 'External Form'}</span>}
          </a>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors w-full text-sm"
          >
            <Globe className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>{language === 'ar' ? 'English' : 'العربية'}</span>}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white hover:bg-destructive/30 transition-colors w-full text-sm font-medium"
          >
            <LogOut className="w-5 h-5 flex-shrink-0 text-white" />
            {sidebarOpen && <span className="text-white">{t('logout')}</span>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 ${sidebarOpen ? 'ms-64' : 'ms-16'} transition-all duration-300`}>
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground">
              {sidebarOpen ? (language === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />) : <Menu className="w-5 h-5" />}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <div className="h-8 w-px bg-border" />
            <div className="text-end">
              <p className="text-sm font-medium text-foreground">{language === 'ar' ? currentUser?.nameAr : currentUser?.nameEn}</p>
              <p className="text-xs text-muted-foreground">{language === 'ar' ? currentUser?.jobTitleAr : currentUser?.jobTitleEn}</p>
            </div>
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {currentUser?.nameEn?.charAt(0)}
            </div>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
