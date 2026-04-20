import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe, Shield, Eye, EyeOff } from 'lucide-react';
import defaultBg from '@/assets/login-bg.jpg';

export default function LoginPage() {
  const { login } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const { settings } = useCompany();
  const bg = settings.loginBackground || defaultBg;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const success = login(username, password);
      if (!success) setError(t('loginError'));
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={bg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/70" />
      </div>

      {/* Language toggle */}
      <button
        onClick={toggleLanguage}
        className="absolute top-6 z-20 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
        style={{ [language === 'ar' ? 'left' : 'right']: '1.5rem' }}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{language === 'ar' ? 'English' : 'العربية'}</span>
      </button>

      {/* Login card */}
      <div className="flex-1 flex items-center justify-center z-10 p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevated p-8 backdrop-blur-sm border border-border/50">
            {/* Logo/Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
                {settings.logo ? (
                  <img src={settings.logo} alt="logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Shield className="w-8 h-8 text-primary-foreground" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? settings.nameAr : settings.nameEn}</h1>
              <p className="text-muted-foreground mt-1 text-sm">{t('appTitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-medium">{t('username')}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="h-11 bg-muted/50 border-border focus:border-primary focus:ring-primary"
                  placeholder={t('username')}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">{t('password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 bg-muted/50 border-border focus:border-primary focus:ring-primary pe-10"
                    placeholder={t('password')}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    style={{ [language === 'ar' ? 'left' : 'right']: '0.75rem' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive text-sm px-4 py-2.5 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 gradient-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : t('loginBtn')}
              </Button>
            </form>
          </div>

          <a
            href="/external-form"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center mt-4 text-primary-foreground/90 text-sm font-medium hover:text-primary-foreground underline underline-offset-4"
          >
            {language === 'ar' ? '🌐 تقديم طلب من خارج النظام (نموذج خارجي)' : '🌐 Submit a request without login (External form)'}
          </a>

          <p className="text-center text-primary-foreground/60 text-xs mt-6">
            © {new Date().getFullYear()} {t('appSubtitle')} — {t('appTitle')}
          </p>
        </div>
      </div>
    </div>
  );
}
