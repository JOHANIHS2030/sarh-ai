import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowDown, FileText, UserCheck, Shield, CreditCard, CheckCircle, XCircle, PauseCircle, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface WorkflowStep {
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  color: string;
}

const defaultSteps: WorkflowStep[] = [
  { titleAr: 'تقديم الطلب', titleEn: 'Submit Request', descAr: 'يقوم الموظف أو المساعد الإداري بتعبئة نموذج طلب بطاقة الهوية مع إرفاق المستندات المطلوبة', descEn: 'Employee or admin assistant fills the ID card request form with required attachments', color: 'bg-primary' },
  { titleAr: 'موافقة مدير القسم', titleEn: 'Department Manager Approval', descAr: 'الموظفون المباشرون: مدير الموارد البشرية | موظفو المقاول: مدير القسم المعني', descEn: 'Direct employees: HR Manager | Contractors: Relevant dept. manager', color: 'bg-info' },
  { titleAr: 'موافقة فريق السلامة', titleEn: 'Safety Team Approval', descAr: 'مقدم توجيه السلامة أو مدير قسم البيئة والصحة والسلامة والأمن', descEn: 'Safety orientation officer or EHSS Manager', color: 'bg-warning' },
  { titleAr: 'مراجعة قسم بطاقات الهوية', titleEn: 'ID Card Team Review', descAr: 'فريق بطاقات الهوية يراجع الطلب والمرفقات ويقرر: قبول أو تعليق أو رفض', descEn: 'ID Card team reviews the request and attachments: approve, hold, or reject', color: 'bg-accent' },
];

const icons = [FileText, UserCheck, Shield, CreditCard];

export default function WorkflowPage() {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const isAr = language === 'ar';
  const isAdmin = currentUser?.role === 'admin';

  const [steps, setSteps] = useState<WorkflowStep[]>(() => {
    const saved = localStorage.getItem('farabi_workflow_steps');
    return saved ? JSON.parse(saved) : defaultSteps;
  });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<WorkflowStep | null>(null);

  const saveSteps = (s: WorkflowStep[]) => {
    setSteps(s);
    localStorage.setItem('farabi_workflow_steps', JSON.stringify(s));
  };

  const startEdit = (i: number) => { setEditingIdx(i); setDraft({ ...steps[i] }); };
  const commitEdit = () => {
    if (editingIdx === null || !draft) return;
    const next = steps.map((s, i) => i === editingIdx ? draft : s);
    saveSteps(next);
    setEditingIdx(null);
    setDraft(null);
    toast({ title: isAr ? 'تم حفظ الخطوة' : 'Step saved' });
  };
  const cancelEdit = () => { setEditingIdx(null); setDraft(null); };
  const resetAll = () => { saveSteps(defaultSteps); toast({ title: isAr ? 'تم استرجاع الافتراضي' : 'Defaults restored' }); };

  const outcomes = [
    { icon: CheckCircle, titleAr: 'مقبول', titleEn: 'Approved', descAr: 'يتم إصدار البطاقة ويمكن طباعة النموذج', descEn: 'Card is issued and form can be printed', color: 'text-success' },
    { icon: PauseCircle, titleAr: 'معلق', titleEn: 'On Hold', descAr: 'يتم إرجاع الطلب مع ذكر السبب لإجراء التعديلات المطلوبة', descEn: 'Request returned with reason for required modifications', color: 'text-warning' },
    { icon: XCircle, titleAr: 'مرفوض', titleEn: 'Rejected', descAr: 'يتم رفض الطلب مع ذكر سبب الرفض', descEn: 'Request rejected with reason', color: 'text-destructive' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{isAr ? 'مخطط سير العمل' : 'Workflow Diagram'}</h1>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={resetAll}>{isAr ? 'استعادة الافتراضي' : 'Reset Defaults'}</Button>
        )}
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 p-8">
        <div className="space-y-2">
          {steps.map((step, i) => {
            const Icon = icons[i] || FileText;
            const isEditing = editingIdx === i;
            return (
              <div key={i}>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-muted-foreground">{isAr ? `الخطوة ${i + 1}` : `Step ${i + 1}`}</span>
                    {isEditing && draft ? (
                      <div className="space-y-2 mt-2">
                        <Input value={isAr ? draft.titleAr : draft.titleEn} onChange={e => setDraft({ ...draft, [isAr ? 'titleAr' : 'titleEn']: e.target.value })} placeholder={isAr ? 'العنوان' : 'Title'} />
                        <Textarea value={isAr ? draft.descAr : draft.descEn} onChange={e => setDraft({ ...draft, [isAr ? 'descAr' : 'descEn']: e.target.value })} rows={2} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={commitEdit} className="gradient-primary text-primary-foreground"><Save className="w-3 h-3 me-1" />{isAr ? 'حفظ' : 'Save'}</Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}><X className="w-3 h-3 me-1" />{isAr ? 'إلغاء' : 'Cancel'}</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-base font-bold text-foreground">{isAr ? step.titleAr : step.titleEn}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{isAr ? step.descAr : step.descEn}</p>
                      </>
                    )}
                  </div>
                  {isAdmin && !isEditing && (
                    <Button variant="ghost" size="icon" onClick={() => startEdit(i)} title={isAr ? 'تعديل' : 'Edit'}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-lg font-bold text-foreground mb-4">{isAr ? 'النتائج المحتملة' : 'Possible Outcomes'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {outcomes.map((o, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
                <o.icon className={`w-8 h-8 mx-auto mb-2 ${o.color}`} />
                <h4 className="font-bold text-foreground">{isAr ? o.titleAr : o.titleEn}</h4>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? o.descAr : o.descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
