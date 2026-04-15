import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { initialDepartments } from '@/data/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Department } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function DepartmentsSettingsPage() {
  const { t, language } = useLanguage();
  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem('farabi_departments');
    return saved ? JSON.parse(saved) : initialDepartments;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ nameAr: '', nameEn: '' });

  const saveDepartments = (deps: Department[]) => {
    setDepartments(deps);
    localStorage.setItem('farabi_departments', JSON.stringify(deps));
  };

  const openNew = () => { setEditing(null); setForm({ nameAr: '', nameEn: '' }); setDialogOpen(true); };
  const openEdit = (d: Department) => { setEditing(d); setForm({ nameAr: d.nameAr, nameEn: d.nameEn }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.nameAr || !form.nameEn) { toast({ title: t('requiredField'), variant: 'destructive' }); return; }
    if (editing) {
      saveDepartments(departments.map(d => d.id === editing.id ? { ...d, ...form } : d));
    } else {
      saveDepartments([...departments, { id: `dept_${uuidv4().slice(0, 8)}`, ...form, approverIds: [] }]);
    }
    setDialogOpen(false);
    toast({ title: t('save') });
  };

  const handleDelete = (id: string) => {
    saveDepartments(departments.filter(d => d.id !== id));
    toast({ title: t('deleteUser') });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('departments')}</h1>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" />{language === 'ar' ? 'إضافة قسم' : 'Add Department'}</Button>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{language === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d, i) => (
                <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3">{d.nameAr}</td>
                  <td className="px-4 py-3">{d.nameEn}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(d)} className="text-primary hover:text-primary/80"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(d.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? (language === 'ar' ? 'تعديل قسم' : 'Edit Department') : (language === 'ar' ? 'إضافة قسم' : 'Add Department')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}</Label><Input value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} /></div>
            <div><Label>{language === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}</Label><Input value={form.nameEn} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))} /></div>
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
