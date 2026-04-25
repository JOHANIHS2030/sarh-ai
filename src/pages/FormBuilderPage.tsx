import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Trash2, FileText, Download, Save, Eye, ChevronUp, ChevronDown,
  Type, Hash, Calendar, CheckSquare, AlignLeft, Table as TableIcon, Edit3, FileDown, Layout
} from 'lucide-react';
import { readLocalJSON, writeLocalJSON } from '@/lib/browserStorage';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { v4 as uuidv4 } from 'uuid';

type FieldType = 'text' | 'longtext' | 'number' | 'date' | 'checkbox' | 'table' | 'signature' | 'heading';

interface BuilderField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  width?: 'full' | 'half' | 'third';
  // For table
  columns?: string[];
  rows?: number;
  // For heading
  level?: 1 | 2;
}

interface BuilderTemplate {
  id: string;
  name: string;
  kind: 'form' | 'report';
  description?: string;
  fields: BuilderField[];
  showHeader: boolean;
  showFooter: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'farabi_form_templates';

const FIELD_TYPES: { value: FieldType; labelAr: string; labelEn: string; icon: any }[] = [
  { value: 'heading', labelAr: 'عنوان قسم', labelEn: 'Section Heading', icon: Layout },
  { value: 'text', labelAr: 'نص قصير', labelEn: 'Short Text', icon: Type },
  { value: 'longtext', labelAr: 'نص طويل', labelEn: 'Long Text', icon: AlignLeft },
  { value: 'number', labelAr: 'رقم', labelEn: 'Number', icon: Hash },
  { value: 'date', labelAr: 'تاريخ', labelEn: 'Date', icon: Calendar },
  { value: 'checkbox', labelAr: 'مربع اختيار', labelEn: 'Checkbox', icon: CheckSquare },
  { value: 'table', labelAr: 'جدول', labelEn: 'Table', icon: TableIcon },
  { value: 'signature', labelAr: 'توقيع', labelEn: 'Signature', icon: Edit3 },
];

function emptyTemplate(kind: 'form' | 'report'): BuilderTemplate {
  return {
    id: uuidv4(),
    name: '',
    kind,
    description: '',
    fields: [],
    showHeader: true,
    showFooter: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function FormBuilderPage() {
  const { language } = useLanguage();
  const { settings: company } = useCompany();
  const { currentUser } = useAuth();
  const isAr = language === 'ar';

  const [templates, setTemplates] = useState<BuilderTemplate[]>(() =>
    readLocalJSON<BuilderTemplate[]>(STORAGE_KEY, [])
  );
  const [editing, setEditing] = useState<BuilderTemplate | null>(null);
  const [previewing, setPreviewing] = useState<BuilderTemplate | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {isAr ? 'هذه الصفحة متاحة فقط لمدير النظام' : 'This page is for system admins only'}
      </div>
    );
  }

  const persist = (next: BuilderTemplate[]) => {
    setTemplates(next);
    writeLocalJSON(STORAGE_KEY, next);
  };

  const saveTemplate = (tpl: BuilderTemplate) => {
    if (!tpl.name.trim()) {
      toast({ title: isAr ? 'يرجى إدخال اسم القالب' : 'Please enter a template name', variant: 'destructive' });
      return;
    }
    const updated = { ...tpl, updatedAt: new Date().toISOString() };
    const exists = templates.some(t => t.id === tpl.id);
    const next = exists ? templates.map(t => (t.id === tpl.id ? updated : t)) : [...templates, updated];
    persist(next);
    toast({ title: isAr ? 'تم حفظ القالب' : 'Template saved' });
    setEditing(null);
  };

  const deleteTemplate = (id: string) => {
    if (!confirm(isAr ? 'حذف القالب؟' : 'Delete template?')) return;
    persist(templates.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isAr ? 'منشئ النماذج والتقارير' : 'Forms & Reports Builder'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAr ? 'صمم نماذجك وتقاريرك المخصصة وقم بتصديرها كـ PDF' : 'Design your custom forms and reports, then export to PDF'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEditing(emptyTemplate('form'))} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> {isAr ? 'نموذج جديد' : 'New Form'}
          </Button>
          <Button onClick={() => setEditing(emptyTemplate('report'))} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> {isAr ? 'تقرير جديد' : 'New Report'}
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            {isAr ? 'لا توجد قوالب بعد. ابدأ بإنشاء نموذج أو تقرير جديد.' : 'No templates yet. Start by creating a new form or report.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-card rounded-xl shadow-card border border-border/50 p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tpl.kind === 'form' ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-accent-foreground'}`}>
                    {tpl.kind === 'form' ? (isAr ? 'نموذج' : 'FORM') : (isAr ? 'تقرير' : 'REPORT')}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{tpl.fields.length} {isAr ? 'حقل' : 'fields'}</span>
              </div>
              <h3 className="font-bold text-foreground">{tpl.name}</h3>
              {tpl.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>}
              <p className="text-[10px] text-muted-foreground mt-auto pt-3">
                {isAr ? 'آخر تعديل' : 'Updated'}: {new Date(tpl.updatedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB')}
              </p>
              <div className="flex gap-1 mt-3 pt-3 border-t border-border/50">
                <Button size="sm" variant="ghost" onClick={() => setPreviewing(tpl)} className="flex-1 gap-1">
                  <Eye className="w-3.5 h-3.5" /> {isAr ? 'معاينة' : 'Preview'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(tpl)} className="flex-1 gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> {isAr ? 'تعديل' : 'Edit'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteTemplate(tpl.id)} className="text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditor
          template={editing}
          isAr={isAr}
          onCancel={() => setEditing(null)}
          onSave={saveTemplate}
          onPreview={setPreviewing}
        />
      )}

      {previewing && (
        <PreviewDialog
          template={previewing}
          company={company}
          isAr={isAr}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}

// ===================== Editor =====================

function TemplateEditor({
  template,
  isAr,
  onCancel,
  onSave,
  onPreview,
}: {
  template: BuilderTemplate;
  isAr: boolean;
  onCancel: () => void;
  onSave: (t: BuilderTemplate) => void;
  onPreview: (t: BuilderTemplate) => void;
}) {
  const [tpl, setTpl] = useState<BuilderTemplate>(template);

  const addField = (type: FieldType) => {
    const newField: BuilderField = {
      id: uuidv4(),
      type,
      label: isAr ? 'حقل جديد' : 'New Field',
      width: 'half',
      ...(type === 'table' ? { columns: [isAr ? 'العمود 1' : 'Column 1', isAr ? 'العمود 2' : 'Column 2'], rows: 3 } : {}),
      ...(type === 'heading' ? { level: 1 } : {}),
    };
    setTpl({ ...tpl, fields: [...tpl.fields, newField] });
  };

  const updateField = (id: string, patch: Partial<BuilderField>) => {
    setTpl({ ...tpl, fields: tpl.fields.map(f => (f.id === id ? { ...f, ...patch } : f)) });
  };

  const removeField = (id: string) => {
    setTpl({ ...tpl, fields: tpl.fields.filter(f => f.id !== id) });
  };

  const moveField = (id: string, dir: -1 | 1) => {
    const idx = tpl.fields.findIndex(f => f.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= tpl.fields.length) return;
    const arr = [...tpl.fields];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setTpl({ ...tpl, fields: arr });
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" />
            {isAr ? `تحرير ${tpl.kind === 'form' ? 'النموذج' : 'التقرير'}` : `Edit ${tpl.kind === 'form' ? 'Form' : 'Report'}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{isAr ? 'اسم القالب' : 'Template Name'} *</Label>
            <Input value={tpl.name} onChange={e => setTpl({ ...tpl, name: e.target.value })} />
          </div>
          <div>
            <Label>{isAr ? 'الوصف' : 'Description'}</Label>
            <Input value={tpl.description || ''} onChange={e => setTpl({ ...tpl, description: e.target.value })} />
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-muted/30 rounded-lg p-3 mt-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            {isAr ? 'إضافة حقل:' : 'Add field:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {FIELD_TYPES.map(ft => (
              <Button key={ft.value} size="sm" variant="outline" onClick={() => addField(ft.value)} className="gap-1">
                <ft.icon className="w-3.5 h-3.5" />
                {isAr ? ft.labelAr : ft.labelEn}
              </Button>
            ))}
          </div>
        </div>

        {/* Fields list */}
        <div className="space-y-2 mt-3">
          {tpl.fields.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              {isAr ? 'ابدأ بإضافة الحقول من الأعلى' : 'Start by adding fields above'}
            </p>
          ) : (
            tpl.fields.map((f, i) => (
              <div key={f.id} className="border border-border rounded-lg p-3 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                    {FIELD_TYPES.find(ft => ft.value === f.type)?.[isAr ? 'labelAr' : 'labelEn']}
                  </span>
                  <div className="ms-auto flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveField(f.id, -1)} disabled={i === 0}><ChevronUp className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveField(f.id, 1)} disabled={i === tpl.fields.length - 1}><ChevronDown className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeField(f.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <Label className="text-xs">{isAr ? 'العنوان' : 'Label'}</Label>
                    <Input value={f.label} onChange={e => updateField(f.id, { label: e.target.value })} />
                  </div>
                  {f.type !== 'heading' && f.type !== 'signature' && f.type !== 'table' && (
                    <div>
                      <Label className="text-xs">{isAr ? 'العرض' : 'Width'}</Label>
                      <Select value={f.width} onValueChange={(v: any) => updateField(f.id, { width: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">{isAr ? 'كامل' : 'Full'}</SelectItem>
                          <SelectItem value="half">{isAr ? 'نصف' : 'Half'}</SelectItem>
                          <SelectItem value="third">{isAr ? 'ثلث' : 'Third'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {f.type === 'table' && (
                    <>
                      <div className="md:col-span-2">
                        <Label className="text-xs">{isAr ? 'الأعمدة (افصل بفاصلة)' : 'Columns (comma-separated)'}</Label>
                        <Input
                          value={(f.columns || []).join(',')}
                          onChange={e => updateField(f.id, { columns: e.target.value.split(',').map(s => s.trim()) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{isAr ? 'عدد الصفوف' : 'Rows'}</Label>
                        <Input type="number" min={1} value={f.rows || 3} onChange={e => updateField(f.id, { rows: parseInt(e.target.value) || 1 })} />
                      </div>
                    </>
                  )}
                  {f.type === 'heading' && (
                    <div>
                      <Label className="text-xs">{isAr ? 'المستوى' : 'Level'}</Label>
                      <Select value={String(f.level || 1)} onValueChange={v => updateField(f.id, { level: parseInt(v) as 1 | 2 })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{isAr ? 'رئيسي' : 'Main'}</SelectItem>
                          <SelectItem value="2">{isAr ? 'فرعي' : 'Sub'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <Button onClick={() => onSave(tpl)} className="gradient-primary text-primary-foreground gap-2">
            <Save className="w-4 h-4" /> {isAr ? 'حفظ' : 'Save'}
          </Button>
          <Button variant="outline" onClick={() => onPreview(tpl)} className="gap-2">
            <Eye className="w-4 h-4" /> {isAr ? 'معاينة' : 'Preview'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===================== Preview =====================

function PreviewDialog({
  template,
  company,
  isAr,
  onClose,
}: {
  template: BuilderTemplate;
  company: any;
  isAr: boolean;
  onClose: () => void;
}) {
  const html = useMemo(() => renderTemplateHtml(template, company, isAr), [template, company, isAr]);

  const exportPdf = async () => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.width = '794px';
    container.style.background = '#fff';
    container.innerHTML = html;
    document.body.appendChild(container);

    await Promise.all(
      Array.from(container.querySelectorAll('img')).map(
        img => new Promise<void>(r => (img.complete ? r() : (img.onload = () => r(), img.onerror = () => r())))
      )
    );

    const page = container.querySelector<HTMLElement>('.pdf-page')!;
    const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const imgH = (canvas.height * pageW) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, Math.min(imgH, 297));
    document.body.removeChild(container);
    pdf.save(`${template.name || 'template'}.pdf`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Eye className="w-5 h-5" /> {isAr ? 'معاينة' : 'Preview'}: {template.name}</span>
            <Button onClick={exportPdf} size="sm" className="gradient-primary text-primary-foreground gap-2 me-6">
              <FileDown className="w-4 h-4" /> {isAr ? 'تصدير PDF' : 'Export PDF'}
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div
          className="border border-border rounded-lg overflow-hidden"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ===================== HTML renderer =====================

function renderTemplateHtml(tpl: BuilderTemplate, company: any, isAr: boolean): string {
  const dir = isAr ? 'rtl' : 'ltr';
  const widthMap = { full: '100%', half: '49%', third: '32%' };

  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
      .pdf-page * { box-sizing: border-box; }
      .pdf-page { width: 794px; min-height: 1123px; padding: 32px 36px; background: #fff;
        font-family: ${isAr ? "'Cairo'" : "'Inter'"}, system-ui, sans-serif; color: #1a1a1a; direction: ${dir}; position: relative; }
      .pdf-page .brand-bar { height: 5px; background: #1a365d; margin: -32px -36px 0; }
      .pdf-page .gold-bar { height: 2px; background: #b8860b; margin: 0 -36px 16px; }
      .pdf-page .header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-bottom: 12px; border-bottom: 1px solid #1a365d; }
      .pdf-page .logo { width: 70px; height: 70px; object-fit: contain; }
      .pdf-page .company-info { flex: 1; text-align: center; }
      .pdf-page .company-info h1 { color: #1a365d; font-size: 16px; font-weight: 700; }
      .pdf-page .company-info h2 { color: #1a365d; font-size: 12px; font-weight: 600; }
      .pdf-page .company-info p { color: #666; font-size: 10px; margin-top: 2px; }
      .pdf-page .doc-title { background: #1a365d; color: #fff; text-align: center; padding: 10px; border-radius: 4px; margin: 14px 0; font-size: 14px; font-weight: 700; }
      .pdf-page .desc { font-size: 11px; color: #666; text-align: center; margin-bottom: 12px; }
      .pdf-page .field-row { display: flex; flex-wrap: wrap; gap: 1%; margin-bottom: 8px; }
      .pdf-page .field { padding: 6px; }
      .pdf-page .field label { display: block; font-size: 10px; color: #475569; font-weight: 600; margin-bottom: 3px; }
      .pdf-page .field .input-box { border: 1px solid #cbd5e1; border-radius: 3px; padding: 6px 8px; min-height: 28px; background: #fff; font-size: 11px; }
      .pdf-page .field .long-box { min-height: 60px; }
      .pdf-page .h1 { font-size: 16px; font-weight: 700; color: #1a365d; margin: 14px 0 6px; padding: 6px 10px; background: #f0f4f8; border-${isAr ? 'right' : 'left'}: 4px solid #1a365d; }
      .pdf-page .h2 { font-size: 13px; font-weight: 600; color: #1a365d; margin: 10px 0 4px; }
      .pdf-page table.b-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
      .pdf-page table.b-table th { background: #1a365d; color: #fff; font-size: 11px; padding: 6px; border: 1px solid #1a365d; }
      .pdf-page table.b-table td { border: 1px solid #cbd5e1; padding: 8px; min-height: 24px; font-size: 11px; }
      .pdf-page .checkbox { display: flex; align-items: center; gap: 6px; font-size: 11px; }
      .pdf-page .checkbox .box { width: 14px; height: 14px; border: 1.5px solid #1a365d; border-radius: 2px; display: inline-block; }
      .pdf-page .signature-box { border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; min-height: 70px; display: flex; flex-direction: column; justify-content: flex-end; }
      .pdf-page .signature-box .line { border-top: 1px dashed #94a3b8; margin-top: auto; padding-top: 4px; text-align: center; font-size: 10px; color: #64748b; }
      .pdf-page .footer { position: absolute; bottom: 14px; left: 36px; right: 36px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; padding-top: 6px; border-top: 1px solid #e2e8f0; }
    </style>
  `;

  const headerHtml = tpl.showHeader
    ? `<div class="brand-bar"></div><div class="gold-bar"></div>
       <div class="header">
         ${company.logo ? `<img class="logo" src="${company.logo}" />` : '<div style="width:70px"></div>'}
         <div class="company-info">
           <h1>${company.nameAr || ''}</h1>
           <h2>${company.nameEn || ''}</h2>
           <p>${isAr ? company.addressAr : company.addressEn}</p>
         </div>
         <div style="width:70px"></div>
       </div>`
    : '';

  const footerHtml = tpl.showFooter
    ? `<div class="footer">
         <span>${isAr ? company.nameAr : company.nameEn} — ${isAr ? 'سري' : 'Confidential'}</span>
         <span>${new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-GB')}</span>
       </div>`
    : '';

  const escape = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Group consecutive non-block fields into rows
  const blocks = tpl.fields.map(f => {
    const w = widthMap[f.width || 'half'];
    if (f.type === 'heading') {
      return `<div class="${f.level === 2 ? 'h2' : 'h1'}">${escape(f.label)}</div>`;
    }
    if (f.type === 'table') {
      const cols = f.columns || [];
      const rows = f.rows || 3;
      return `<div class="field" style="width:100%">
        <label>${escape(f.label)}</label>
        <table class="b-table">
          <thead><tr>${cols.map(c => `<th>${escape(c)}</th>`).join('')}</tr></thead>
          <tbody>${Array.from({ length: rows }).map(() => `<tr>${cols.map(() => '<td>&nbsp;</td>').join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`;
    }
    if (f.type === 'signature') {
      return `<div class="field" style="width:${w}">
        <label>${escape(f.label)}</label>
        <div class="signature-box"><div class="line">${isAr ? 'التوقيع والتاريخ' : 'Signature & Date'}</div></div>
      </div>`;
    }
    if (f.type === 'checkbox') {
      return `<div class="field" style="width:${w}">
        <div class="checkbox"><span class="box"></span><span>${escape(f.label)}</span></div>
      </div>`;
    }
    if (f.type === 'longtext') {
      return `<div class="field" style="width:${w}">
        <label>${escape(f.label)}</label>
        <div class="input-box long-box"></div>
      </div>`;
    }
    // text/number/date
    return `<div class="field" style="width:${w}">
      <label>${escape(f.label)}</label>
      <div class="input-box"></div>
    </div>`;
  });

  return styles + `<div class="pdf-page">
    ${headerHtml}
    <div class="doc-title">${escape(tpl.name)}</div>
    ${tpl.description ? `<div class="desc">${escape(tpl.description)}</div>` : ''}
    <div class="field-row">${blocks.join('')}</div>
    ${footerHtml}
  </div>`;
}
