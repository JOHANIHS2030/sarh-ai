import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useViolations } from '@/contexts/ViolationsContext';
import { calculateFine, weeksBetween } from '@/lib/fineRules';
import { ViolationAssetType, ViolationType } from '@/types/violation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Gavel } from 'lucide-react';

export default function NewViolationPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { addViolation, countLostOffenses, isBanned } = useViolations();

  const [assetType, setAssetType] = useState<ViolationAssetType>('id_card');
  const [violationType, setViolationType] = useState<ViolationType>('lost');
  const [contractorName, setContractorName] = useState('');
  const [contractorCompany, setContractorCompany] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const priorLost = employeeId.trim() ? countLostOffenses(employeeId) : 0;
  const offenseNumber = priorLost + 1;
  const weeksOverdue = violationType === 'not_returned' ? weeksBetween(incidentDate) : 0;

  const outcome = useMemo(
    () => calculateFine(violationType, { offenseNumber, weeksOverdue }),
    [violationType, offenseNumber, weeksOverdue]
  );

  const alreadyBanned = employeeId.trim() ? isBanned(employeeId) : false;

  const submit = () => {
    if (!contractorName.trim() || !contractorCompany.trim() || !employeeId.trim() || !documentNumber.trim()) {
      toast({
        title: isAr ? 'بيانات ناقصة' : 'Missing data',
        description: isAr ? 'يرجى تعبئة جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }
    const rec = addViolation({
      assetType,
      violationType,
      contractorName: contractorName.trim(),
      contractorCompany: contractorCompany.trim(),
      employeeId: employeeId.trim(),
      documentNumber: documentNumber.trim(),
      incidentDate,
      offenseNumber: violationType === 'lost' ? offenseNumber : 0,
      weeksOverdue,
      fineAmount: outcome.fineAmount,
      banned: outcome.banned,
      referredToSecurity: outcome.referredToSecurity,
      notes: notes.trim() || undefined,
      createdBy: currentUser?.id || '',
    });
    toast({
      title: isAr ? 'تم إصدار المخالفة' : 'Violation issued',
      description: `${rec.violationNumber} — ${rec.fineAmount} ${isAr ? 'ريال' : 'SAR'}`,
    });
    navigate('/violations/all');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Gavel className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'إصدار مخالفة / غرامة' : 'Issue Violation / Fine'}</h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'للمقاولين فقط — بطاقات الهوية وتصاريح المركبات' : 'Contractors only — ID cards & vehicle permits'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? 'بيانات المخالفة' : 'Violation details'}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{isAr ? 'نوع المستند' : 'Document type'}</Label>
            <Select value={assetType} onValueChange={v => setAssetType(v as ViolationAssetType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="id_card">{isAr ? 'بطاقة هوية' : 'ID Card'}</SelectItem>
                <SelectItem value="vehicle_sticker">{isAr ? 'تصريح/ملصق مركبة' : 'Vehicle Permit'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'نوع المخالفة' : 'Violation type'}</Label>
            <Select value={violationType} onValueChange={v => setViolationType(v as ViolationType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lost">{isAr ? 'فقدان المستند' : 'Lost document'}</SelectItem>
                <SelectItem value="not_returned">
                  {isAr ? 'عدم إعادة مستند منتهي' : 'Expired document not returned'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'اسم المخالف' : 'Violator name'}</Label>
            <Input value={contractorName} onChange={e => setContractorName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'شركة المقاول' : 'Contractor company'}</Label>
            <Input value={contractorCompany} onChange={e => setContractorCompany(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'الرقم الوظيفي' : 'Employee ID'}</Label>
            <Input value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'رقم البطاقة / التصريح' : 'Card / Permit number'}</Label>
            <Input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>
              {violationType === 'lost'
                ? isAr ? 'تاريخ الفقدان' : 'Loss date'
                : isAr ? 'تاريخ انتهاء المستند' : 'Document expiry date'}
            </Label>
            <Input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>{isAr ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="text-base">{isAr ? 'الغرامة المحتسبة' : 'Calculated fine'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold text-primary">
              {outcome.fineAmount} <span className="text-base font-medium">{isAr ? 'ريال' : 'SAR'}</span>
            </span>
            {violationType === 'lost' && (
              <Badge variant="secondary">
                {isAr ? `المخالفة رقم ${offenseNumber} لهذا الشخص` : `Offense #${offenseNumber} for this person`}
              </Badge>
            )}
            {violationType === 'not_returned' && (
              <Badge variant="secondary">
                {isAr ? `${weeksOverdue} أسبوع تأخير` : `${weeksOverdue} weeks overdue`}
              </Badge>
            )}
            {outcome.referredToSecurity && (
              <Badge variant="destructive">{isAr ? 'إحالة للجهة الأمنية' : 'Referred to security authority'}</Badge>
            )}
            {outcome.banned && (
              <Badge variant="destructive">{isAr ? 'حرمان من الإصدار' : 'Barred from issuance'}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{isAr ? outcome.ruleAr : outcome.ruleEn}</p>

          {alreadyBanned && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <span>
                {isAr
                  ? 'هذا الشخص محروم مسبقاً من إصدار بطاقة أو تصريح مركبة.'
                  : 'This person is already barred from ID card / vehicle permit issuance.'}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={submit}>{isAr ? 'إصدار المخالفة' : 'Issue violation'}</Button>
            <Button variant="outline" onClick={() => navigate('/violations/all')}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? 'لائحة الغرامات' : 'Fines policy'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {isAr
              ? '• فقدان البطاقة أو تصريح المركبة: 500 ريال للمرة الأولى، 1000 ريال للمرة الثانية، وفي المرة الثالثة يُحرم من الإصدار ويُحال للجهة الأمنية.'
              : '• Loss of ID card or vehicle permit: SAR 500 first time, SAR 1000 second time; on the third loss the person is barred from issuance and referred to the security authority.'}
          </p>
          <p>
            {isAr
              ? '• كل بطاقة أو تصريح منتهٍ لم يُعد لإدارة الأمن الصناعي: 100 ريال عن كل أسبوع بحد أقصى 500 ريال.'
              : '• Each expired card/permit not returned to Industrial Security: SAR 100 per week, capped at SAR 500.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
