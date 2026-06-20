import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import { VehicleStickerRequest } from '@/types/vehicleSticker';
import { Department, User } from '@/types';
import { CompanySettings } from '@/contexts/CompanyContext';

interface GenerateArgs {
  sticker: VehicleStickerRequest;
  department?: Department;
  creator?: User;
  approverUser?: User; // department-stage approver
  reviewerUser?: User; // security/issuance reviewer
  company: CompanySettings;
  language: 'ar' | 'en';
  statusLabel: string;
}

function generateBarcodeDataURL(value: string): string {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: false,
      margin: 0,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
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

  // Cairo bundled locally — load each weight against Arabic text before snapshot
  try {
    const sample = 'النموذج العربي ABC 123';
    const weights = ['400', '600', '700'];
    await Promise.all(
      weights.flatMap(w => [
        (document as any).fonts.load(`${w} 14px "Cairo"`, sample),
        (document as any).fonts.load(`${w} 14px "Inter"`, sample),
      ])
    );
    await (document as any).fonts.ready;
    await new Promise(r => setTimeout(r, 50));
  } catch {
    /* ignore */
  }

  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      img =>
        new Promise<void>(resolve => {
          if ((img as HTMLImageElement).complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  const pages = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'));
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;

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

function escapeHtml(s: string | undefined | null): string {
  if (s === null || s === undefined || s === '') return '—';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function generateStickerPDF({
  sticker,
  department,
  creator,
  approverUser,
  reviewerUser,
  company,
  language,
  statusLabel,
}: GenerateArgs) {
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const tr = (ar: string, en: string) => (isAr ? ar : en);
  const barcodeUrl = generateBarcodeDataURL(sticker.requestNumber);

  const stickerTypeLabel =
    sticker.stickerType === 'employee'
      ? tr('موظف الشركة', 'Company Employee')
      : sticker.stickerType === 'company_vehicle'
        ? tr('سيارة الشركة', 'Company Vehicle')
        : tr('مركبة مقاول', 'Contractor Vehicle');

  const styles = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .pdf-page {
        width: 794px;
        min-height: 1123px;
        padding: 32px 36px;
        background: #fff;
        font-family: 'Cairo', 'Noto Naskh Arabic', 'Segoe UI', Tahoma, sans-serif;
        font-feature-settings: "kern", "liga", "calt";
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        color: #1a1a1a;
        direction: ${dir};
        page-break-after: always;
        position: relative;
      }
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
      .title-bar { background: #1a365d; color: #fff; text-align: center; padding: 10px; border-radius: 4px; margin: 16px 0 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; }
      .meta { display: flex; justify-content: space-between; font-size: 11px; color: #555; margin-bottom: 12px; }
      .section-title { background: #f0f4f8; color: #1a365d; padding: 7px 10px; font-size: 12px; font-weight: 700; border-${isAr ? 'right' : 'left'}: 4px solid #1a365d; margin: 14px 0 8px; }
      table.fields { width: 100%; border-collapse: collapse; }
      table.fields td { border: 1px solid #d8dee9; padding: 6px 9px; font-size: 11px; vertical-align: middle; }
      table.fields td.lbl { background: #f8fafc; color: #475569; font-weight: 600; width: 30%; font-size: 10px; }
      table.fields td.val { color: #0f172a; }
      .att-list { width: 100%; border-collapse: collapse; }
      .att-list tr td { border-bottom: 1px solid #eef2f6; padding: 5px 8px; font-size: 11px; }
      .att-list tr:nth-child(even) td { background: #fafbfd; }
      .ok { color: #15803d; font-weight: 700; font-size: 11px; }
      .signatures { display: flex; gap: 10px; margin-top: 8px; }
      .sig-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; min-height: 110px; display: flex; flex-direction: column; }
      .sig-box .sig-head { background: #f0f4f8; color: #1a365d; padding: 5px; text-align: center; font-size: 10px; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
      .sig-body { flex: 1; display: flex; align-items: center; justify-content: center; padding: 6px; position: relative; }
      .sig-body img { max-width: 100%; max-height: 60px; }
      .sig-foot { padding: 4px 6px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 9px; color: #64748b; }
      .sig-foot .name { font-weight: 700; color: #1f2937; font-size: 10px; }
      .stamp { position: absolute; top: 4px; ${isAr ? 'left' : 'right'}: 4px; color: #15803d; font-size: 9px; font-weight: 700; border: 1px solid #15803d; padding: 1px 4px; border-radius: 3px; }
      .pending-stamp { color: #b8860b; border: 1px dashed #b8860b; padding: 4px 8px; border-radius: 3px; font-size: 9px; font-style: italic; }
      .status-badge { display: inline-block; margin: 14px auto 0; padding: 6px 18px; border-radius: 18px; font-size: 12px; font-weight: 700; }
      .status-approved { background: #d4edda; color: #155724; border: 1px solid #15803d; }
      .status-other { background: #fff3cd; color: #856404; border: 1px solid #b8860b; }
      .status-wrap { text-align: center; }
      .footer { position: absolute; bottom: 14px; left: 36px; right: 36px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; padding-top: 6px; border-top: 1px solid #e2e8f0; }
      .att-img { max-width: 100%; max-height: 880px; object-fit: contain; display: block; margin: 12px auto; border: 1px solid #cbd5e1; padding: 4px; background: #fff; }
      .att-title { background: #b8860b; color: #fff; padding: 8px 12px; border-radius: 4px; text-align: center; font-weight: 700; font-size: 13px; margin-bottom: 8px; }
      .permit-box { background: #ecfdf5; border: 2px solid #15803d; border-radius: 6px; padding: 14px; margin-top: 8px; }
      .permit-box h3 { color: #15803d; font-size: 13px; margin-bottom: 8px; text-align: center; }
    </style>
  `;

  const headerHtml = `
    <div class="brand-bar"></div>
    <div class="gold-bar"></div>
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
        <div class="num">${escapeHtml(sticker.requestNumber)}</div>
        ${barcodeUrl ? `<img src="${barcodeUrl}" />` : ''}
      </div>
    </div>
  `;

  const footerHtml = `
    <div class="footer">
      <span>${escapeHtml(isAr ? company.nameAr : company.nameEn)} — ${tr('سري', 'Confidential')}</span>
      <span>${tr('تاريخ التوليد', 'Generated')}: ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-GB')}</span>
    </div>
  `;

  const fieldRow = (lbl: string, val: string | undefined | null) =>
    `<tr><td class="lbl">${escapeHtml(lbl)}</td><td class="val">${escapeHtml(val)}</td></tr>`;

  const driverTable = `
    <table class="fields">
      ${fieldRow(tr('نوع الملصق', 'Sticker Type'), stickerTypeLabel)}
      ${fieldRow(tr('اسم السائق', 'Driver Name'), sticker.driver.name)}
      ${fieldRow(tr('الرقم الوظيفي', 'Employee No.'), sticker.driver.employeeId)}
      ${fieldRow(tr('الجنسية', 'Nationality'), sticker.driver.nationality)}
      ${fieldRow(tr('رقم رخصة القيادة', 'License Number'), sticker.driver.licenseNumber)}
      ${fieldRow(tr('مكان الإصدار', 'Issue Place'), sticker.driver.licenseIssuePlace)}
      ${fieldRow(tr('تاريخ الإصدار', 'Issue Date'), sticker.driver.licenseIssueDate)}
      ${fieldRow(tr('تاريخ الانتهاء', 'Expiry Date'), sticker.driver.licenseExpiryDate)}
    </table>
  `;

  const vehicleTable = `
    <table class="fields">
      ${fieldRow(tr('نوع المركبة / الموديل', 'Vehicle Type / Model'), sticker.vehicle.vehicleType)}
      ${fieldRow(tr('رقم اللوحة', 'Plate Number'), sticker.vehicle.plateNumber)}
      ${fieldRow(tr('اللون', 'Color'), sticker.vehicle.color)}
    </table>
  `;

  const contractorTable = sticker.contractor
    ? `<table class="fields">
        ${fieldRow(tr('اسم الشركة المقاولة', 'Contractor Company'), sticker.contractor.contractorName)}
        ${fieldRow(tr('رقم العقد', 'Contract No.'), sticker.contractor.contractNumber)}
        ${fieldRow(tr('مدة العقد', 'Contract Duration'), sticker.contractor.contractDuration)}
        ${fieldRow(tr('ابتداءً من', 'Start Date'), sticker.contractor.contractStartDate)}
        ${fieldRow(tr('تاريخ الانتهاء', 'End Date'), sticker.contractor.contractEndDate)}
        ${fieldRow(tr('مندوب المقاول', 'Representative'), sticker.contractor.contractorRepresentative)}
        ${fieldRow(tr('اسم المسؤول', 'Responsible'), sticker.contractor.responsibleName)}
        ${fieldRow(tr('رقم الهاتف', 'Phone'), sticker.contractor.phoneNumber)}
      </table>`
    : '';

  const submitTable = `
    <table class="fields">
      ${fieldRow(tr('مقدم الطلب', 'Submitted By'), creator ? (isAr ? creator.nameAr : creator.nameEn) : (sticker.createdBy.startsWith('external:') ? sticker.createdBy.replace('external:', '') : '—'))}
      ${fieldRow(tr('الإدارة المعنية', 'Approving Department'), department ? (isAr ? department.nameAr : department.nameEn) : '—')}
      ${fieldRow(tr('تاريخ التقديم', 'Submission Date'), new Date(sticker.createdAt).toLocaleString(isAr ? 'ar-SA' : 'en-GB'))}
      ${fieldRow(tr('الحالة الحالية', 'Current Status'), statusLabel)}
      ${fieldRow(tr('آخر تحديث', 'Last Update'), new Date(sticker.updatedAt).toLocaleString(isAr ? 'ar-SA' : 'en-GB'))}
    </table>
  `;

  const attChecklist = sticker.attachments.length === 0
    ? `<p style="color:#94a3b8;font-size:11px;padding:6px">${tr('لا توجد مرفقات', 'No attachments submitted.')}</p>`
    : `<table class="att-list">${sticker.attachments
        .map(
          (a, i) =>
            `<tr><td style="width:30px"><span class="ok">✓</span></td><td>${i + 1}. ${escapeHtml(a.name)}</td><td style="text-align:${isAr ? 'left' : 'right'};color:#64748b">${escapeHtml(a.type)}</td></tr>`
        )
        .join('')}</table>`;

  // Signatures: Stage 1 (Department) + Stage 2 (Industrial Safety / ID Section)
  const dept = sticker.departmentApproval;
  const sec = sticker.securityIssuance;

  const stage1 = dept
    ? `<div class="sig-box">
        <div class="sig-head">${tr('موافقة الإدارة المعنية', 'Department Approval')}</div>
        <div class="sig-body">
          <span class="stamp">${tr('معتمد', 'APPROVED')}</span>
          ${(approverUser?.signature) ? `<img src="${approverUser.signature}" />` : `<span style="color:#94a3b8;font-size:10px">${tr('بدون توقيع', 'No signature')}</span>`}
        </div>
        <div class="sig-foot">
          <div class="name">${escapeHtml(dept.approverName)}</div>
          <div>${escapeHtml(dept.approverJobTitle)} — ${escapeHtml(dept.approverDepartment)}</div>
          <div>${new Date(dept.approvedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB')}</div>
        </div>
      </div>`
    : `<div class="sig-box">
        <div class="sig-head">${tr('موافقة الإدارة المعنية', 'Department Approval')}</div>
        <div class="sig-body"><span class="pending-stamp">${tr('بانتظار التوقيع', 'Pending signature')}</span></div>
        <div class="sig-foot">${tr('التوقيع والتاريخ', 'Signature & Date')}</div>
      </div>`;

  const stage2 = sec
    ? `<div class="sig-box">
        <div class="sig-head">${tr('قسم الأمن الصناعي / بطاقات الهوية', 'Industrial Safety / ID Section')}</div>
        <div class="sig-body">
          <span class="stamp">${tr('صدر', 'ISSUED')}</span>
          ${(reviewerUser?.signature) ? `<img src="${reviewerUser.signature}" />` : `<span style="color:#94a3b8;font-size:10px">${tr('بدون توقيع', 'No signature')}</span>`}
        </div>
        <div class="sig-foot">
          <div class="name">${escapeHtml(sec.reviewerName)}</div>
          <div>${escapeHtml(sec.reviewerEmployeeId)}</div>
          <div>${new Date(sec.issuedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB')}</div>
        </div>
      </div>`
    : `<div class="sig-box">
        <div class="sig-head">${tr('قسم الأمن الصناعي / بطاقات الهوية', 'Industrial Safety / ID Section')}</div>
        <div class="sig-body"><span class="pending-stamp">${tr('بانتظار الإصدار', 'Pending issuance')}</span></div>
        <div class="sig-foot">${tr('التوقيع والتاريخ', 'Signature & Date')}</div>
      </div>`;

  const signaturesHtml = `<div class="signatures">${stage1}${stage2}</div>`;

  const issuanceHtml =
    sticker.status === 'approved' && sec
      ? `<div class="section-title">${tr('بيانات الإصدار النهائي للملصق', 'Final Sticker Issuance Details')}</div>
         <div class="permit-box">
           <h3>${tr('تصريح ملصق المركبة', 'Vehicle Sticker Permit')}</h3>
           <table class="fields">
             ${fieldRow(tr('رقم التصريح', 'Permit No.'), sec.permitNumber)}
             ${fieldRow(tr('تاريخ الإصدار', 'Issue Date'), sec.issueDate)}
             ${fieldRow(tr('تاريخ الانتهاء', 'Expiry Date'), sec.expiryDate)}
             ${fieldRow(tr('صدر بواسطة', 'Issued By'), sec.reviewerName)}
             ${fieldRow(tr('الرقم الوظيفي', 'Employee No.'), sec.reviewerEmployeeId)}
           </table>
         </div>`
      : '';

  const statusClass = sticker.status === 'approved' ? 'status-approved' : 'status-other';
  const statusBadge = `<div class="status-wrap"><span class="status-badge ${statusClass}">${sticker.status === 'approved' ? '✓ ' : ''}${escapeHtml(statusLabel.toUpperCase())}</span></div>`;

  let html = styles + `<div class="pdf-page">
    ${headerHtml}
    <div class="title-bar">${tr('نموذج طلب إصدار ملصق مركبة', 'VEHICLE STICKER REQUEST FORM')}</div>
    <div class="meta">
      <span>${tr('التاريخ', 'Date')}: ${new Date(sticker.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB')}</span>
      <span>${tr('الحالة', 'Status')}: ${escapeHtml(statusLabel)}</span>
    </div>
    <div class="section-title">${tr('1. بيانات السائق', '1. Driver Information')}</div>
    ${driverTable}
    <div class="section-title">${tr('2. بيانات المركبة', '2. Vehicle Information')}</div>
    ${vehicleTable}
    ${sticker.contractor ? `<div class="section-title">${tr('3. بيانات المقاول', '3. Contractor Information')}</div>${contractorTable}` : ''}
    <div class="section-title">${tr('4. بيانات الطلب', '4. Submission Details')}</div>
    ${submitTable}
    <div class="section-title">${tr('5. المرفقات المقدمة', '5. Submitted Attachments')}</div>
    ${attChecklist}
    <div class="section-title">${tr('6. الموافقات والتواقيع', '6. Approvals & Signatures')}</div>
    ${signaturesHtml}
    ${issuanceHtml}
    ${statusBadge}
    ${footerHtml}
  </div>`;

  // Attachment pages
  for (let i = 0; i < sticker.attachments.length; i++) {
    const att = sticker.attachments[i];
    if (!att.data) continue;
    let body = '';
    if (att.type.startsWith('image/')) {
      body = `<img class="att-img" src="${att.data}" />`;
    } else if (att.type === 'application/pdf') {
      body = `<div style="background:#f0f4f8;border-radius:6px;padding:40px;text-align:center;margin-top:20px">
        <h2 style="color:#1a365d">${tr('ملف PDF مرفق', 'PDF Document Attached')}</h2>
        <p style="color:#475569;margin-top:10px">${tr('يرجى تحميل الملف الأصلي من النظام لعرضه.', 'Please download the original file from the system.')}</p>
        <p style="margin-top:8px;color:#64748b">${escapeHtml(att.name)}</p>
      </div>`;
    } else {
      body = `<p style="padding:20px;color:#475569">${tr('ملف', 'File')}: ${escapeHtml(att.name)} (${escapeHtml(att.type)})</p>`;
    }
    html += `<div class="pdf-page">
      ${headerHtml}
      <div class="att-title">${tr('المرفق', 'ATTACHMENT')} ${i + 1} / ${sticker.attachments.length}: ${escapeHtml(att.name)}</div>
      ${body}
      ${footerHtml}
    </div>`;
  }

  await renderHtmlToPdf(html, `${sticker.requestNumber}.pdf`);
}
