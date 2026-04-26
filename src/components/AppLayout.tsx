import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard, FilePlus, FileText, CheckSquare, LogOut, Globe, Shield,
  ChevronLeft, ChevronRight, Menu, Users, Building2, Activity, GitBranch, Settings, ExternalLink, Wand2, Car
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationsBell from '@/components/NotificationsBell';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { currentUser, logout } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isAdmin = currentUser?.role === 'admin';
  const isIdCardTeam = currentUser?.systemRole === 'id_card_executor' || currentUser?.systemRole === 'security_chief';
  const isSafety = currentUser?.systemRole === 'safety_orientation' || currentUser?.systemRole === 'ehss_manager';
  const isDeptManager = currentUser?.systemRole === 'dept_manager' || currentUser?.systemRole === 'hr_manager';

  const navItems: { to: string; icon: typeof LayoutDashboard; label: string; show: boolean; section: string }[] = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard'), show: true, section: 'main' },

    { to: '/new-request', icon: FilePlus, label: t('newRequest'), show: true, section: 'idcards' },
    { to: '/my-requests', icon: FileText, label: t('myRequests'), show: true, section: 'idcards' },
    { to: '/pending-approvals', icon: CheckSquare, label: t('pendingApprovals'), show: isDeptManager || isSafety || isIdCardTeam || isAdmin, section: 'idcards' },
    { to: '/all-requests', icon: FileText, label: t('allRequests'), show: isAdmin || isIdCardTeam, section: 'idcards' },

    { to: '/stickers/new', icon: FilePlus, label: language === 'ar' ? 'طلب ملصق جديد' : 'New Sticker', show: true, section: 'stickers' },
    { to: '/stickers/my', icon: Car, label: language === 'ar' ? 'ملصقاتي' : 'My Stickers', show: true, section: 'stickers' },
    { to: '/stickers/pending', icon: CheckSquare, label: language === 'ar' ? 'موافقات الملصقات' : 'Sticker Approvals', show: isDeptManager || isIdCardTeam || isAdmin, section: 'stickers' },
    { to: '/stickers/all', icon: FileText, label: language === 'ar' ? 'جميع الملصقات' : 'All Stickers', show: isAdmin || isIdCardTeam, section: 'stickers' },

    { to: '/workflow', icon: GitBranch, label: language === 'ar' ? 'سير العمل' : 'Workflow', show: true, section: 'admin' },
    { to: '/audit-log', icon: Activity, label: language === 'ar' ? 'سجل العمليات' : 'Audit Log', show: isAdmin, section: 'admin' },
    { to: '/builder', icon: Wand2, label: language === 'ar' ? 'منشئ النماذج والتقارير' : 'Forms & Reports Builder', show: isAdmin, section: 'admin' },
    { to: '/settings/users', icon: Users, label: t('users'), show: isAdmin, section: 'admin' },
    { to: '/settings/external-users', icon: ExternalLink, label: language === 'ar' ? 'مستخدمو الصفحات الخارجية' : 'External Users', show: isAdmin, section: 'admin' },
    { to: '/settings/departments', icon: Building2, label: t('departments'), show: isAdmin, section: 'admin' },
    { to: '/settings/company', icon: Settings, label: language === 'ar' ? 'إعدادات الشركة' : 'Company Settings', show: isAdmin, section: 'admin' },
  ];

  const sectionLabels: Record<string, { ar: string; en: string }> = {
    main: { ar: '', en: '' },
    idcards: { ar: 'بطاقات الهوية', en: 'ID Cards' },
    stickers: { ar: 'ملصقات المركبات', en: 'Vehicle Stickers' },
    admin: { ar: 'الإدارة', en: 'Administration' },
  };

  const sectionsOrder = ['main', 'idcards', 'stickers', 'admin'];

  const externalUrl = `${window.location.origin}/external-form`;

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 flex flex-col fixed h-full z-30`}
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-accent-foreground" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-sidebar-foreground truncate">{t('appTitle')}</h2>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">{t('appSubtitle')}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.filter(n => n.show).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors text-sm"
              activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
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
