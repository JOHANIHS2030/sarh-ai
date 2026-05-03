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
    .declaration { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px; margin: 10px 0; }
    .declaration .decl-title { font-weight: 700; color: #1a365d; font-size: 12px; margin-bottom: 6px; }
    .declaration p { font-size: 10.5px; line-height: 1.55; color: #1f2937; margin-bottom: 6px; }
    .conditions { margin-top: 10px; }
    .conditions .cond-title { background: #1a365d; color: #fff; padding: 6px 10px; font-size: 11px; font-weight: 700; border-radius: 3px; }
    .conditions .cond-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px; }
    .conditions ol { padding-${isAr ? 'right' : 'left'}: 18px; font-size: 9.5px; color: #1f2937; line-height: 1.5; }
    .conditions ol li { margin-bottom: 3px; }
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
  let declarationHtml = '';
  let photoConditionsHtml = '';

  if (permit.mobile) {
    detailsTable = `<table class="fields">
      ${row(tr('تاريخ الطلب', 'Request Date'), permit.mobile.requestDate)}
      ${row(tr('القسم', 'Department'), department ? (isAr ? department.nameAr : department.nameEn) : '—')}
      ${row(tr('نوع الجوال المراد إدخاله', 'Mobile Type to Enter'), permit.mobile.deviceType)}
    </table>`;
    declarationHtml = `<div class="declaration">
      <div class="decl-title">${tr('إقرار وتعهد', 'Declaration and Undertaking')}</div>
      <p dir="rtl" lang="ar">${escapeHtml('تمت مراجعة هذا الطلب بعد تعبئته بالمعلومات المطلوبة للحصول على موافقتكم لإدخال الجوال المطلوب للغرض المشار إليه في هذا التصريح وأن يتم استخدامه في منطقة المكاتب وغرفة التحكم الرئيسية فقط وحسب حاجة العمل.')}</p>
      <p dir="ltr" lang="en">${escapeHtml('I hereby refer to this application after it has been filled in with the required information to get your consent to be authorized as intended purpose of this application and will be used in offices, MCR and for the work purpose only.')}</p>
    </div>`;
  } else if (permit.laptop) {
    detailsTable = `<table class="fields">
      ${row(tr('التاريخ من', 'Date From'), permit.laptop.requestedFrom)}
      ${row(tr('التاريخ إلى', 'Date To'), permit.laptop.requestedTo)}
      ${row(tr('القسم', 'Department'), department ? (isAr ? department.nameAr : department.nameEn) : '—')}
      ${row(tr('اسم الموظف', 'Employee Name'), permit.applicant.name)}
      ${row(tr('رقم البطاقة', 'ID Card Number'), permit.laptop.idCardNumber)}
      ${row(tr('الوظيفة', 'Job Title'), permit.applicant.jobTitle)}
      ${row(tr('نوع وموديل الجهاز المحمول', 'Laptop Type & Model'), `${permit.laptop.laptopBrand} ${permit.laptop.laptopModel || ''}`.trim())}
      ${row(tr('الرقم التسلسلي', 'Serial Number'), permit.laptop.serialNumber)}
      ${row(tr('رقم ملصق الفارابي', 'Farabi Sticker Number'), permit.laptop.farabiStickerNo)}
      ${permit.laptop.itReviewNotes ? row(tr('ملاحظات تقنية المعلومات', 'IT Notes'), permit.laptop.itReviewNotes) : ''}
    </table>`;
  } else if (permit.photography) {
    const p = permit.photography;
    const ptype = [p.photographyType?.video ? tr('فيديو', 'Video') : null,
      p.photographyType?.photoDigital ? tr('فوتوغرافي / رقمي', 'Photographic / Digital') : null]
      .filter(Boolean).join(' + ');
    detailsTable = `<table class="fields">
      ${row(tr('القسم', 'Department'), department ? (isAr ? department.nameAr : department.nameEn) : '—')}
      ${row(tr('نوع ورقم آلة التصوير', 'Camera Type & Number'), p.cameraTypeAndNumber)}
      ${row(tr('نوعية التصوير', 'Photography Type'), ptype)}
      ${row(tr('المنطقة المطلوب تصويرها', 'Areas to be Photographed'), p.locations)}
      ${row(tr('اسم المصور المخصص (الفارابي)', 'Designated Photographer (FYPC)'), p.photographerName)}
      ${row(tr('الوظيفة', 'Job Title'), p.photographerJobTitle)}
    </table>`;
    declarationHtml = `<div class="declaration">
      <div class="decl-title">${tr('إقرار وتعهد', 'Declaration and Undertaking')}</div>
      <p dir="rtl" lang="ar">${escapeHtml('تمت مراجعة هذا الطلب بعد تعبئته بالمعلومات المطلوبة للحصول على مرافقتكم لإجراء التصوير المطلوب للغرض المشار إليه في هذا التصريح. وبهذا أؤكد بأن عملية التصوير سوف تتم حسب الشروط المذكورة في هذا التصريح وسوف تتم إجراءاتها طبقاً للأنظمة والتعليمات المبلغة لنا بهذا الخصوص.')}</p>
      <p dir="ltr" lang="en">${escapeHtml('I hereby refer to this application after it has been filled in with the required information to get your consent to be authorized as intended purpose of this application. I, the undersigned further confirm that the process of photography will be carried out in accordance with the conditions mentioned in this application knowing that the process of photography will be conducted in conformity with the rules and controls will be implemented in this regard.')}</p>
    </div>`;

    const condAr = [
      'يجب أن تتم عملية التصوير طبقاً للضوابط المدرجة أدناه. وعدم الوفاء لأي من الضوابط سوف لا يستحق لهذه العملية.',
      'يجب تحديد الغرض والنوع من التصوير وكذلك الجهة المنفذة له.',
      'يجب تنفيذ عملية التصوير من قبل موظف سعودي لدى شركة الفارابي مصرح له بالتصوير من قبل إدارة البيئة والصحة والسلامة والأمن. وإذا تعذر ذلك فبالإمكان الاستعانة بخبرات مصورين غير سعوديين من جهات أخرى حيث أن عملية التصوير تنفذ تحت إشراف مباشر من قبل مشرف وردية الأمن بإدارة البيئة والصحة والسلامة والأمن.',
      'يجب تحديد المنطقة المطلوبة للتصوير (مواقع/مباني الخ) وكذلك المنشآت المجاورة وينبغي ألا يظهر أي مواقع أخرى في التصوير.',
      'يقدم محضر ضبط تصوير إلى إدارة البيئة والصحة والسلامة والأمن بعد إكمال التصوير مع ذكر عدد الصور الملتقطة والمدة من البداية إلى النهاية.',
      'يتم التأكد من تلافي تصوير المنشأة المجاورة بالتحكم في زاوية عدسة التصوير للكاميرا ويتم توثيق كل اللقطات التي تم أخذها بمحضر ضبط التصوير والموقع من إدارة البيئة والصحة والسلامة والأمن والجهة الطالبة.',
      'يجب أن يتم التصوير تحت إشراف ومتابعة مشرف وردية الأمن بإدارة البيئة والصحة والسلامة والأمن. ويتولى قسم الأمن الإشراف على حفظ وتوثيق الصور والأفلام وأساساتها وكل ما يتعلق بذلك من وثائق داخل المنشأة في مكان آمن واستعمالها للغرض الذي صورت من أجله فقط.',
      'لا يتم استعمال الفيلم أو الصور الملتقطة للمنشأة للغرض الذي صورت من أجله إلا بعد إجازة الصور أو الفيلم من الناحية الأمنية من قبل إدارة البيئة والصحة والسلامة والأمن والجهة الطالبة للتصوير بالمنشأة وفق محضر إجازة صور.',
      'يصدر تصريح التصوير للمصور الذي يقوم بالتقاط الصور.',
    ];
    const condEn = [
      'The photography session shall only be carried out in accordance to below conditions. Any condition that will not be met shall not merit the session.',
      'Photography shall be conducted by an authorized FYPC employee.',
      'The purpose of the intended photography shall be indicated in the permit. Specifying the type of photography and the party conducting it. The subject (i.e., site, building) to be photographed and the adjacent establishments should be specified. No other subject must be intently visible in the photography.',
      'The undertakings on the permit shall be understood by party or department concerned who carry out the photography. The party or concerned department shall be accountable if they have been found to have violated the instructions stipulated in the conditions of photography.',
      'Photography shall be conducted under the supervision and follow-up of a Security Supervisor in the EHSS Department of which the data, documentation of the pictures and films and their negatives as well as all other related material shall be controlled and stored by Security Section. Photos or videos shall not be used for any other purpose that is permitted for.',
      'The intended number of photographs needed for the process of shooting shall be indicated together with the duration at which the process should begin and end.',
      'A photography report shall be submitted to Security Section after the shoot indicating the number of photographs taken in the process together with the duration at which the process started and ended.',
      'The camera zooming should be controlled in a way that the adjacent establishments may not appear in the photograph. The photo session should be documented in the photography report by the party or concerned department.',
      'In the case of a military unit adjacent to the site intended to be photographed is affected, a permit should be obtained from the Governorate which will, in turn, coordinate in this respect with the command of the military district which the said adjacent military unit follows.',
    ];
    photoConditionsHtml = `<div class="conditions">
      <div class="cond-title">${tr('الشروط والضوابط لإصدار تصريح التصوير', 'Conditions for Issuing Photography Permit')}</div>
      <div class="cond-grid">
        <ol dir="rtl" lang="ar">${condAr.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ol>
        <ol dir="ltr" lang="en">${condEn.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ol>
      </div>
    </div>`;
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
