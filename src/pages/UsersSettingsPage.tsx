import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, UserRole, SystemRole } from '@/types';
import { PermitSignAuthority } from '@/types/permit';
import { PERMIT_AUTHORITY_CATALOG } from '@/lib/permitAuthority';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const systemRoles: { value: SystemRole; labelAr: string; labelEn: string }[] = [
  { value: 'id_card_executor', labelAr: 'منفذ بطاقات الهوية', labelEn: 'ID Card Executor' },
  { value: 'security_chief', labelAr: 'رئيس قسم الأمن', labelEn: 'Security Chief' },
  { value: 'safety_orientation', labelAr: 'مقدم توجيه السلامة', labelEn: 'Safety Orientation' },
  { value: 'ehss_manager', labelAr: 'مدير EHSS', labelEn: 'EHSS Manager' },
  { value: 'hr_manager', labelAr: 'مدير الموارد البشرية', labelEn: 'HR Manager' },
  { value: 'dept_manager', labelAr: 'مدير قسم', labelEn: 'Department Manager' },
  { value: 'requester', labelAr: 'مقدم طلب', labelEn: 'Requester' },
];

export default function UsersSettingsPage() {
  const { t, language } = useLanguage();
  const { users, addUser, updateUser, deleteUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<Partial<User>>({});

  const openNew = () => {
    setEditingUser(null);
    setForm({ role: 'user', systemRole: 'requester' });
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm(user);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nameEn || !form.username || !form.password) {
      toast({ title: t('requiredField'), variant: 'destructive' });
      return;
    }
    if (editingUser) {
      updateUser({ ...editingUser, ...form } as User);
    } else {
      addUser({ ...form, id: uuidv4() } as User);
    }
    setDialogOpen(false);
    toast({ title: t('save') });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('users')}</h1>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" />{t('addUser')}</Button>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('name')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('username')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('role')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('jobTitle')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('email')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3">{language === 'ar' ? u.nameAr : u.nameEn}</td>
                  <td className="px-4 py-3 font-mono">{u.username}</td>
                  <td className="px-4 py-3">{t(u.role)}</td>
                  <td className="px-4 py-3">{language === 'ar' ? u.jobTitleAr : u.jobTitleEn}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-primary hover:text-primary/80"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { deleteUser(u.id); toast({ title: t('deleteUser') }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? t('editUser') : t('addUser')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('nameAr')}</Label><Input value={form.nameAr || ''} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} /></div>
              <div><Label>{t('nameEn')}</Label><Input value={form.nameEn || ''} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))} /></div>
              <div><Label>{t('username')}</Label><Input value={form.username || ''} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} /></div>
              <div><Label>{t('password')}</Label><Input value={form.password || ''} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
              <div><Label>{t('email')}</Label><Input value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div>
                <Label>{t('role')}</Label>
                <Select value={form.role || 'user'} onValueChange={v => setForm(p => ({ ...p, role: v as UserRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('admin')}</SelectItem>
                    <SelectItem value="user">{t('user')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>{language === 'ar' ? 'الدور في النظام' : 'System Role'}</Label>
                <Select value={form.systemRole || 'requester'} onValueChange={v => setForm(p => ({ ...p, systemRole: v as SystemRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {systemRoles.map(r => <SelectItem key={r.value} value={r.value}>{language === 'ar' ? r.labelAr : r.labelEn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{language === 'ar' ? 'المسمى الوظيفي (عربي)' : 'Job Title (Arabic)'}</Label><Input value={form.jobTitleAr || ''} onChange={e => setForm(p => ({ ...p, jobTitleAr: e.target.value }))} /></div>
              <div><Label>{language === 'ar' ? 'المسمى الوظيفي (إنجليزي)' : 'Job Title (English)'}</Label><Input value={form.jobTitleEn || ''} onChange={e => setForm(p => ({ ...p, jobTitleEn: e.target.value }))} /></div>
              <div className="col-span-2">
                <Label>{language === 'ar' ? 'التوقيع الإلكتروني (صورة)' : 'Electronic Signature (Image)'}</Label>
                <div className="flex items-center gap-3 mt-1">
                  {form.signature && (
                    <img src={form.signature} alt="sig" className="h-14 bg-muted/30 rounded border border-border p-1" />
                  )}
                  <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md bg-muted hover:bg-muted/80 text-sm">
                    {language === 'ar' ? 'رفع توقيع' : 'Upload Signature'}
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const r = new FileReader(); r.onload = () => setForm(p => ({ ...p, signature: r.result as string })); r.readAsDataURL(file);
                    }} />
                  </label>
                  {form.signature && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, signature: undefined }))} className="text-destructive text-xs hover:underline">
                      {language === 'ar' ? 'حذف' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>

              {/* Permit signing authorities */}
              <div className="col-span-2">
                <Label className="block mb-2">
                  {language === 'ar' ? 'صلاحيات التواقيع - نظام التصاريح' : 'Permit Signing Authorities'}
                </Label>
                <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {language === 'ar' ? 'صلاحيات التوقيع على أنواع التصاريح' : 'Permit Type Sign-off'}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {PERMIT_AUTHORITY_CATALOG.filter(a => a.group === 'permit').map(auth => {
                        const checked = form.permitAuthorities?.includes(auth.value) || false;
                        return (
                          <label key={auth.value} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => {
                                const current = form.permitAuthorities || [];
                                const next = checked
                                  ? current.filter(x => x !== auth.value)
                                  : [...current, auth.value];
                                setForm(p => ({ ...p, permitAuthorities: next as PermitSignAuthority[] }));
                              }}
                            />
                            <span className="text-sm">{language === 'ar' ? auth.ar : auth.en}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {language === 'ar' ? 'الأدوار التنظيمية (مرحلة الموافقة)' : 'Organizational Roles (approval stage)'}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {PERMIT_AUTHORITY_CATALOG.filter(a => a.group === 'role').map(auth => {
                        const checked = form.permitAuthorities?.includes(auth.value) || false;
                        return (
                          <label key={auth.value} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => {
                                const current = form.permitAuthorities || [];
                                const next = checked
                                  ? current.filter(x => x !== auth.value)
                                  : [...current, auth.value];
                                setForm(p => ({ ...p, permitAuthorities: next as PermitSignAuthority[] }));
                              }}
                            />
                            <span className="text-sm">{language === 'ar' ? auth.ar : auth.en}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {language === 'ar'
                      ? 'لتوقيع تصريح في مرحلة معينة يجب على المستخدم اختيار صلاحية النوع + الدور التنظيمي معاً.'
                      : 'To sign a permit at a stage, the user must hold both the type authority and the role.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleSave} className="gradient-primary text-primary-foreground">{t('save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
