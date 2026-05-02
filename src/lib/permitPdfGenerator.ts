import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import { PermitRequest } from '@/types/permit';
import { Department, User } from '@/types';
import { CompanySettings } from '@/contexts/CompanyContext';
import { permitTypeLabel } from '@/lib/permitAuthority';

interface GenerateArgs {
  permit: PermitRequest;
  department?: Department;
  creator?: User;
  approverUsers: User[]; // resolved users for stage approvals (to fetch signatures)
  company: CompanySettings;
  language: 'ar' | 'en';
  statusLabel: string;
}

function generateBarcodeDataURL(value: string): string {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, { format: 'CODE128', width: 2, height: 50, displayValue: false, margin: 0, background: '#ffffff', lineColor: '#000000' });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

function escapeHtml(s: string | undefined | null): string {
  if (s === null || s === undefined || s === '') return '—';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function renderHtmlToPdf(html: string, fileName: string) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const fonts = ['400 14px "Cairo"', '600 14px "Cairo"', '700 14px "Cairo"', '400 14px "Inter"', '700 14px "Inter"'];
    await Promise.all(fonts.map(f => (document as any).fonts.load(f, 'النموذج Form')));
    await (document as any).fonts.ready;
  } catch { /* ignore */ }

  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(imgs.map(img => new Promise<void>(resolve => {
    if ((img as HTMLImageElement).complete) return resolve();
    img.onload = () => resolve();
    img.onerror = () => resolve();
  })));

  const pages = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'));
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210, pageH = 297;

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    const img = canvas.toDataURL('image/jpeg', 0.92);
    if (i > 0) pdf.addPage();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    if (imgH <= pageH) {
      pdf.addImage(img, 'JPEG', 0, 0, imgW, imgH);
    } else {
      const h = pageH;
      const w = (canvas.width * h) / canvas.height;
      pdf.addImage(img, 'JPEG', (pageW - w) / 2, 0, w, h);
    }
  }
  document.body.removeChild(container);
  pdf.save(fileName);
}

export async function generatePermitPDF({
  permit, department, creator, approverUsers, company, language, statusLabel,
}: GenerateArgs) {
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const tr = (ar: string, en: string) => (isAr ? ar : en);
  const barcode = generateBarcodeDataURL(permit.requestNumber);
  const typeName = permitTypeLabel(permit.permitType, language);

  const styles = `<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .pdf-page { width: 794px; min-height: 1123px; padding: 32px 36px; background: #fff;
      font-family: ${isAr ? "'Cairo'" : "'Inter'"}, system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif;
      color: #1a1a1a; direction: ${dir}; page-break-after: always; position: relative; }
    .brand-bar { height: 5px; background: #1a365d; margin: -32px -36px 0; }
    .gold-bar  { height: 2px; background: #b8860b; margin: 0 -36px 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-bottom: 12px; border-bottom: 1px solid #1a365d; }
    .logo { width: 80px; height: 80px; object-fit: contain; }
    .company-info { flex: 1; text-align: center; }
    .company-info h1 { color: #1a365d; font-size: 18px; font-weight: 700; }
    .company-info h2 { color: #1a365d; font-size: 14px; font-weight: 600; margin-top: 2px; }
    .company-info p { color: #666; font-size: 11px; margin-top: 3px; }
    .req-info { text-align: ${isAr ? 'left' : 'right'}; min-width: 160px; }
    .req-info .label { font-size: 10px; color: #666; }
    .req-info .num { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700; color: #1a365d; }
    .req-info img { margin-top: 4px; max-width: 160px; height: 40px; }
    .title-bar { background: #1a365d; color: #fff; text-align: center; padding: 10px; border-radius: 4px; margin: 16px 0 12px; font-size: 14px; font-weight: 700; }
    .section-title { background: #f0f4f8; color: #1a365d; padding: 7px 10px; font-size: 12px; font-weight: 700; border-${isAr ? 'right' : 'left'}: 4px solid #1a365d; margin: 14px 0 8px; }
    table.fields { width: 100%; border-collapse: collapse; }
    table.fields td { border: 1px solid #d8dee9; padding: 6px 9px; font-size: 11px; vertical-align: middle; }
    table.fields td.lbl { background: #f8fafc; color: #475569; font-weight: 600; width: 30%; font-size: 10px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
    .sig-box { border: 1px solid #cbd5e1; border-radius: 4px; min-height: 130px; display: flex; flex-direction: column; }
    .sig-box .sig-head { background: #f0f4f8; color: #1a365d; padding: 5px; text-align: center; font-size: 10px; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
    .sig-body { flex: 1; display: flex; align-items: center; justify-content: center; padding: 6px; position: relative; }
    .sig-body img { max-width: 100%; max-height: 60px; }
    .sig-foot { padding: 4px 6px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 9px; color: #64748b; }
    .sig-foot .name { font-weight: 700; color: #1f2937; font-size: 10px; }
    .stamp { position: absolute; top: 4px; ${isAr ? 'left' : 'right'}: 4px; color: #15803d; font-size: 9px; font-weight: 700; border: 1px solid #15803d; padding: 1px 4px; border-radius: 3px; }
    .status-badge { display: inline-block; margin: 14px auto 0; padding: 6px 18px; border-radius: 18px; font-size: 12px; font-weight: 700; }
    .status-approved { background: #d4edda; color: #155724; border: 1px solid #15803d; }
    .status-other { background: #fff3cd; color: #856404; border: 1px solid #b8860b; }
    .status-wrap { text-align: center; }
    .footer { position: absolute; bottom: 14px; left: 36px; right: 36px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; padding-top: 6px; border-top: 1px solid #e2e8f0; }
    .note { background: #fffbea; border: 1px solid #fde68a; padding: 8px; border-radius: 4px; font-size: 10px; color: #92400e; margin-top: 6px; }
  </style>`;

  const headerHtml = `
    <div class="brand-bar"></div><div class="gold-bar"></div>
    <div class="header">
      ${company.logo ? `<img class="logo" src="${company.logo}" crossorigin="anonymous" />` : '<div style="width:80px"></div>'}
      <div class="company-info">
        <h1>${escapeHtml(company.nameAr)}</h1>
        <h2>${escapeHtml(company.nameEn)}</h2>
        <p>${escapeHtml(isAr ? company.addressAr : company.addressEn)}</p>
        <p>${escapeHtml(company.phone)} &nbsp;|&nbsp; ${escapeHtml(company.email)} &nbsp;|&nbsp; ${escapeHtml(company.website)}</p>
      </div>
      <div class="req-info">
        <div class="label">${tr('رقم الطلب', 'Request No.')}</div>
        <div class="num">${escapeHtml(permit.requestNumber)}</div>
        ${barcode ? `<img src="${barcode}" />` : ''}
      </div>
    </div>`;

  const footerHtml = `<div class="footer">
    <span>${escapeHtml(isAr ? company.nameAr : company.nameEn)} — ${tr('سري', 'Confidential')}</span>
    <span>${tr('تاريخ التوليد', 'Generated')}: ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-GB')}</span>
  </div>`;

  const row = (lbl: string, val: string | undefined | null) =>
    `<tr><td class="lbl">${escapeHtml(lbl)}</td><td>${escapeHtml(val)}</td></tr>`;

  const applicantTable = `<table class="fields">
    ${row(tr('نوع التصريح', 'Permit Type'), typeName)}
    ${row(tr('الاسم', 'Name'), permit.applicant.name)}
    ${row(tr('الرقم الوظيفي', 'Employee No.'), permit.applicant.employeeId)}
    ${row(tr('المسمى الوظيفي', 'Job Title'), permit.applicant.jobTitle)}
    ${row(tr('الجنسية', 'Nationality'), permit.applicant.nationality)}
    ${row(tr('الإدارة', 'Department'), department ? (isAr ? department.nameAr : department.nameEn) : '—')}
    ${permit.applicant.companyName ? row(tr('الشركة', 'Company'), permit.applicant.companyName) : ''}
    ${permit.applicant.phoneNumber ? row(tr('الهاتف', 'Phone'), permit.applicant.phoneNumber) : ''}
  </table>`;

  let detailsTable = '';
  if (permit.mobile) {
    detailsTable = `<table class="fields">
      ${row(tr('نوع الجهاز', 'Device'), permit.mobile.deviceType)}
      ${row(tr('IMEI', 'IMEI'), permit.mobile.deviceImei || '')}
      ${row(tr('الرقم التسلسلي', 'Serial'), permit.mobile.serialNumber || '')}
      ${row(tr('من تاريخ', 'From'), permit.mobile.requestedFrom)}
      ${row(tr('إلى تاريخ', 'To'), permit.mobile.requestedTo)}
      ${row(tr('السبب', 'Reason'), permit.mobile.reason)}
    </table>`;
  } else if (permit.laptop) {
    detailsTable = `<table class="fields">
      ${row(tr('الماركة', 'Brand'), permit.laptop.laptopBrand)}
      ${row(tr('الموديل', 'Model'), permit.laptop.laptopModel)}
      ${row(tr('الرقم التسلسلي', 'Serial'), permit.laptop.serialNumber)}
      ${row(tr('رقم الأصل', 'Asset Tag'), permit.laptop.assetTag || '')}
      ${row(tr('من تاريخ', 'From'), permit.laptop.requestedFrom)}
      ${row(tr('إلى تاريخ', 'To'), permit.laptop.requestedTo)}
      ${row(tr('السبب', 'Reason'), permit.laptop.reason)}
    </table>`;
  } else if (permit.photography) {
    const p = permit.photography;
    detailsTable = `<table class="fields">
      ${row(tr('اسم المصور', 'Photographer'), p.photographerName)}
      ${row(tr('رقم الهوية', 'ID'), p.photographerId)}
      ${row(tr('المعدات', 'Equipment'), p.equipmentDescription)}
      ${row(tr('من', 'From'), `${p.fromDate} ${p.fromTime || ''}`)}
      ${row(tr('إلى', 'To'), `${p.toDate} ${p.toTime || ''}`)}
      ${row(tr('المواقع', 'Locations'), p.locations)}
      ${row(tr('الغرض', 'Purpose'), p.purpose)}
      ${p.affectsMilitaryUnit ? row(tr('مرجع تصريح المحافظة', 'Governorate Approval Ref.'), p.governorateApprovalRef || '') : ''}
    </table>
    ${p.affectsMilitaryUnit ? `<div class="note">${tr(
      'في حال تأثر وحدة عسكرية مجاورة، يتم الحصول على تصريح من المحافظة وتقوم المحافظة بالتنسيق مع قيادة المنطقة العسكرية.',
      'When an adjacent military unit is affected, a permit is obtained from the Governorate, which coordinates with the military district command.'
    )}</div>` : ''}`;
  }

  // Stage signature boxes
  const sigBoxes = permit.stageApprovals.map(sa => {
    const u = approverUsers.find(x => x.id === sa.approverUserId);
    const sig = u?.signature || sa.signature;
    return `<div class="sig-box">
      <div class="sig-head">${escapeHtml(stageHeader(sa.stage, isAr))}</div>
      <div class="sig-body">
        <span class="stamp">${tr('معتمد', 'APPROVED')}</span>
        ${sig ? `<img src="${sig}" />` : `<span style="color:#94a3b8;font-size:10px">${tr('بدون توقيع', 'No signature')}</span>`}
      </div>
      <div class="sig-foot">
        <div class="name">${escapeHtml(sa.approverName)}</div>
        <div>${escapeHtml(sa.approverJobTitle)}${sa.approverDepartment ? ' — ' + escapeHtml(sa.approverDepartment) : ''}</div>
        <div>${new Date(sa.approvedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB')}</div>
      </div>
    </div>`;
  }).join('');

  const submitTable = `<table class="fields">
    ${row(tr('مقدم الطلب', 'Submitted By'), creator ? (isAr ? creator.nameAr : creator.nameEn) : (permit.createdBy.startsWith('external:') ? permit.createdBy.replace('external:', '') : '—'))}
    ${row(tr('تاريخ التقديم', 'Submission Date'), new Date(permit.createdAt).toLocaleString(isAr ? 'ar-SA' : 'en-GB'))}
    ${row(tr('الحالة الحالية', 'Current Status'), statusLabel)}
    ${row(tr('آخر تحديث', 'Last Update'), new Date(permit.updatedAt).toLocaleString(isAr ? 'ar-SA' : 'en-GB'))}
  </table>`;

  const statusClass = permit.status === 'approved' ? 'status-approved' : 'status-other';
  const statusBadge = `<div class="status-wrap"><span class="status-badge ${statusClass}">${permit.status === 'approved' ? '✓ ' : ''}${escapeHtml(statusLabel.toUpperCase())}</span></div>`;

  const html = styles + `<div class="pdf-page">
    ${headerHtml}
    <div class="title-bar">${tr('نموذج طلب تصريح', 'PERMIT REQUEST FORM')} — ${escapeHtml(typeName)}</div>
    <div class="section-title">${tr('1. بيانات مقدم الطلب', '1. Applicant Information')}</div>
    ${applicantTable}
    <div class="section-title">${tr('2. تفاصيل التصريح', '2. Permit Details')}</div>
    ${detailsTable}
    <div class="section-title">${tr('3. بيانات التقديم', '3. Submission Details')}</div>
    ${submitTable}
    <div class="section-title">${tr('4. المراحل والتواقيع', '4. Approval Stages & Signatures')}</div>
    <div class="signatures">${sigBoxes || `<div style="grid-column:1/-1;color:#94a3b8;font-size:11px;text-align:center;padding:14px">${tr('لم يتم اعتماد أي مرحلة بعد', 'No stages approved yet')}</div>`}</div>
    ${statusBadge}
    ${footerHtml}
  </div>`;

  await renderHtmlToPdf(html, `${permit.requestNumber}.pdf`);
}

function stageHeader(stage: string, isAr: boolean): string {
  switch (stage) {
    case 'pending_dept_manager':   return isAr ? 'موافقة مدير الإدارة' : 'Department Manager Approval';
    case 'pending_it_review':      return isAr ? 'مراجعة تقنية المعلومات' : 'IT Department Review';
    case 'pending_security_chief': return isAr ? 'موافقة رئيس الأمن الصناعي' : 'Industrial Safety Chief';
    case 'pending_ehss_manager':   return isAr ? 'توقيع مدير EHSS' : 'EHSS Manager Signature';
    default: return stage;
  }
}
