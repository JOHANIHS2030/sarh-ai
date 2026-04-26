import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExternalUsers } from '@/contexts/ExternalUsersContext';
import { initialDepartments } from '@/data/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Shield, Building2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ExternalUser } from '@/types/externalUser';
import { readLocalJSON } from '@/lib/browserStorage';
import { Department } from '@/types';

export default function ExternalUsersSettingsPage() {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const { externalUsers, addExternalUser, updateExternalUser, deleteExternalUser } = useExternalUsers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalUser | null>(null);
  const [form, setForm] = useState<Partial<ExternalUser>>({
    active: true,
    allowedDepartmentIds: [],
  });

  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const departments: Department[] = readLocalJSON<Department[]>('farabi_departments', initialDepartments);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-card p-8 rounded-2xl border border-border max-w-md">
          <Shield className="w-12 h-12 mx-auto text-destructive mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            {t('غير مصرح', 'Not Authorized')}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('هذه الصفحة متاحة لمدير النظام فقط', 'This page is for system administrators only')}
          </p>
        </div>
      </div>
    );
  }

  const openNew = () => {
    setEditing(null);
    setForm({ active: true, allowedDepartmentIds: [] });
    setDialogOpen(true);
  };

  const openEdit = (u: ExternalUser) => {
    setEditing(u);
    setForm(u);
    setDialogOpen(true);
  };

  const toggleDept = (id: string) => {
    const list = form.allowedDepartmentIds || [];
    setForm(p => ({
      ...p,
      allowedDepartmentIds: list.includes(id) ? list.filter(x => x !== id) : [...list, id],
    }));
  };

  const handleSave = () => {
    if (!form.username || !form.password || !form.representativeName || !form.companyName) {
      toast({ title: t('يرجى تعبئة الحقول المطلوبة', 'Please fill required fields'), variant: 'destructive' });
      return;
    }
    if (!form.allowedDepartmentIds || form.allowedDepartmentIds.length === 0) {
      toast({ title: t('يجب اختيار قسم واحد على الأقل', 'Select at least one department'), variant: 'destructive' });
      return;
    }
    if (editing) {
      updateExternalUser({ ...editing, ...form } as ExternalUser);
      toast({ title: t('تم تحديث المستخدم', 'User updated') });
    } else {
      addExternalUser(form as Omit<ExternalUser, 'id' | 'createdAt'>);
      toast({ title: t('تمت إضافة المستخدم', 'User added') });
    }
    setDialogOpen(false);
  };

  const deptName = (id: string) => {
    const d = departments.find(x => x.id === id);
    if (!d) return id;
    return language === 'ar' ? d.nameAr : d.nameEn;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('مستخدمو الصفحات الخارجية', 'External Form Users')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              'إدارة مندوبي الشركات المسموح لهم بالدخول إلى النموذج الخارجي',
              'Manage contractor representatives allowed to access the external form'
            )}
          </p>
        </div>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" />
          {t('إضافة مستخدم', 'Add User')}
        </Button>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('اسم المندوب', 'Representative')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('الشركة', 'Company')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('اسم المستخدم', 'Username')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('الجوال', 'Mobile')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('الأقسام المسموحة', 'Allowed Depts')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('الحالة', 'Status')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {externalUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    {t('لا يوجد مستخدمون خارجيون بعد', 'No external users yet')}
                  </td>
                </tr>
              ) : (
                externalUsers.map((u, i) => (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{u.representativeName}</td>
                    <td className="px-4 py-3">{u.companyName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.mobile}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.allowedDepartmentIds.map(id => (
                          <span key={id} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {deptName(id)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {u.active ? t('نشط', 'Active') : t('معطل', 'Disabled')}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => openEdit(u)} className="text-primary hover:text-primary/80">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t('هل أنت متأكد من الحذف؟', 'Are you sure?'))) {
                            deleteExternalUser(u.id);
                            toast({ title: t('تم الحذف', 'Deleted') });
                          }
                        }}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('تعديل مستخدم خارجي', 'Edit External User') : t('إضافة مستخدم خارجي', 'Add External User')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('اسم المندوب', 'Representative Name')} <span className="text-destructive">*</span></Label>
                <Input value={form.representativeName || ''} onChange={e => setForm(p => ({ ...p, representativeName: e.target.value }))} />
              </div>
              <div>
                <Label>{t('اسم الشركة', 'Company Name')} <span className="text-destructive">*</span></Label>
                <Input value={form.companyName || ''} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} />
              </div>
              <div>
                <Label>{t('رقم الجوال', 'Mobile')}</Label>
                <Input value={form.mobile || ''} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} />
              </div>
              <div>
                <Label>{t('رقم الهاتف', 'Phone')}</Label>
                <Input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                <Input type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <Label>{t('اسم المستخدم', 'Username')} <span className="text-destructive">*</span></Label>
                <Input value={form.username || ''} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
              </div>
              <div>
                <Label>{t('كلمة المرور', 'Password')} <span className="text-destructive">*</span></Label>
                <Input value={form.password || ''} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">
                {t('الأقسام المسموح التعامل معها', 'Allowed Departments')} <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-lg max-h-60 overflow-y-auto">
                {departments.map(d => (
                  <label key={d.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <Checkbox
                      checked={form.allowedDepartmentIds?.includes(d.id) || false}
                      onCheckedChange={() => toggleDept(d.id)}
                    />
                    <span className="text-sm">{language === 'ar' ? d.nameAr : d.nameEn}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <Switch
                checked={form.active ?? true}
                onCheckedChange={v => setForm(p => ({ ...p, active: v }))}
              />
              <Label>{t('حساب نشط (يمكنه الدخول)', 'Active (can log in)')}</Label>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
              <Button onClick={handleSave} className="gradient-primary text-primary-foreground">
                {t('حفظ', 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
