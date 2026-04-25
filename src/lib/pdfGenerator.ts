import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import { IDCardRequest, Department, User } from '@/types';
import { CompanySettings } from '@/contexts/CompanyContext';

interface GenerateArgs {
  request: IDCardRequest;
  department?: Department;
  creator?: User;
  approvers?: { stage: string; user?: User; date?: string }[];
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

// Render an HTML node into a hidden container and convert to PDF pages.
// Uses html2canvas which fully supports Arabic, custom fonts, and images.
async function renderHtmlToPdf(html: string, fileName: string) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '794px'; // A4 width @ 96dpi
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  // Wait for images to load
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      img =>
        new Promise<void>(resolve => {
          if (img.complete) return resolve();
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
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
    const img = canvas.toDataURL('image/jpeg', 0.92);
    if (i > 0) pdf.addPage();
    // Fit canvas into A4 keeping aspect ratio
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    if (imgH <= pageH) {
      pdf.addImage(img, 'JPEG', 0, 0, imgW, imgH);
    } else {
      // Scale to fit height
      const h = pageH;
      const w = (canvas.width * h) / canvas.height;
      pdf.addImage(img, 'JPEG', (pageW - w) / 2, 0, w, h);
    }
  }

  document.body.removeChild(container);
  pdf.save(fileName);
}

function escapeHtml(s: string | undefined | null): string {
  if (s === null || s === undefined) return '—';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function generateRequestPDF({
  request,
  department,
  creator,
  approvers = [],
  company,
  language,
  statusLabel,
}: GenerateArgs) {
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const tr = (ar: string, en: string) => (isAr ? ar : en);

  const barcodeUrl = generateBarcodeDataURL(request.requestNumber);

  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .pdf-page {
        width: 794px;
        min-height: 1123px;
        padding: 32px 36px;
        background: #fff;
        font-family: ${isAr ? "'Cairo'" : "'Inter'"}, system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif;
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
      table.fields td.lbl { background: #f8fafc; color: #475569; font-weight: 600; width: 25%; font-size: 10px; }
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
      .issuance-box { background: #ecfdf5; border: 1px solid #15803d; border-radius: 4px; padding: 10px; margin-top: 8px; }
      .issuance-box h3 { color: #15803d; font-size: 12px; margin-bottom: 6px; }
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
        <div class="num">${escapeHtml(request.requestNumber)}</div>
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
    `<tr><td class="lbl">${escapeHtml(lbl)}</td><td class="val">${escapeHtml(val) || '—'}</td></tr>`;

  const fieldsTable = `
    <table class="fields">
      ${fieldRow(tr('نوع الموظف', 'Employee Type'), request.employeeType === 'direct' ? tr('موظف مباشر', 'Direct Employee') : tr('موظف مقاول', 'Contractor Employee'))}
      ${fieldRow(tr('القسم', 'Department'), isAr ? department?.nameAr : department?.nameEn)}
      ${fieldRow(tr('الاسم بالعربية', 'Name (Arabic)'), request.nameAr)}
      ${fieldRow(tr('الاسم بالإنجليزية', 'Name (English)'), request.nameEn)}
      ${fieldRow(tr('الجنسية', 'Nationality'), request.nationality)}
      ${fieldRow(tr('الرقم الوظيفي', 'Employee No.'), request.employeeId)}
      ${fieldRow(tr('المسمى الوظيفي', 'Job Title'), request.jobTitle)}
      ${fieldRow(tr('رقم الهوية / الإقامة', 'National ID / Iqama'), request.nationalIdNo)}
      ${fieldRow(tr('تاريخ ومكان الإصدار', 'Date & Issue Place'), request.dateIssuePlace)}
      ${fieldRow(tr('تاريخ الميلاد', 'Birth Date'), request.birthDate)}
      ${fieldRow(tr('فصيلة الدم', 'Blood Type'), request.bloodType)}
      ${fieldRow(tr('اسم الشركة وعنوانها', 'Company Name & Tel.'), request.companyNameTel)}
    </table>
  `;

  const submitTable = `
    <table class="fields">
      ${fieldRow(tr('مقدم الطلب', 'Submitted By'), creator ? (isAr ? creator.nameAr : creator.nameEn) : (request.createdBy === 'external' ? tr('نموذج خارجي', 'External Web Form') : '—'))}
      ${fieldRow(tr('تاريخ التقديم', 'Submission Date'), new Date(request.createdAt).toLocaleString(isAr ? 'ar-SA' : 'en-GB'))}
      ${fieldRow(tr('الحالة الحالية', 'Current Status'), statusLabel)}
      ${fieldRow(tr('آخر تحديث', 'Last Update'), new Date(request.updatedAt).toLocaleString(isAr ? 'ar-SA' : 'en-GB'))}
    </table>
  `;

  const attChecklist = request.attachments.length === 0
    ? `<p style="color:#94a3b8;font-size:11px;padding:6px">${tr('لا توجد مرفقات', 'No attachments submitted.')}</p>`
    : `<table class="att-list">${request.attachments
        .map(
          (a, i) =>
            `<tr><td style="width:30px"><span class="ok">✓</span></td><td>${i + 1}. ${escapeHtml(a.name)}</td><td style="text-align:${isAr ? 'left' : 'right'};color:#64748b">${escapeHtml(a.type)}</td></tr>`
        )
        .join('')}</table>`;

  // Signatures
  const stages = [
    { key: 'pending_dept_approval', label: tr('مدير القسم', 'Department Manager') },
    { key: 'pending_safety_approval', label: tr('فريق السلامة', 'Safety Team') },
    { key: 'pending_id_review', label: tr('قسم بطاقات الهوية', 'ID Card Section') },
  ];

  const signaturesHtml = `
    <div class="signatures">
      ${stages
        .map(stg => {
          const entry = request.approvalHistory.find(h => h.stage === stg.key && h.action === 'approve');
          const approver = approvers.find(a => a.stage === stg.key);
          if (entry && approver?.user) {
            return `<div class="sig-box">
              <div class="sig-head">${stg.label}</div>
              <div class="sig-body">
                <span class="stamp">${tr('معتمد', 'APPROVED')}</span>
                ${approver.user.signature ? `<img src="${approver.user.signature}" />` : `<span style="color:#94a3b8;font-size:10px">${tr('بدون توقيع', 'No signature')}</span>`}
              </div>
              <div class="sig-foot">
                <div class="name">${escapeHtml(isAr ? approver.user.nameAr : approver.user.nameEn)}</div>
                <div>${new Date(entry.timestamp).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB')}</div>
              </div>
            </div>`;
          }
          return `<div class="sig-box">
            <div class="sig-head">${stg.label}</div>
            <div class="sig-body"><span class="pending-stamp">${tr('بانتظار التوقيع', 'Pending signature')}</span></div>
            <div class="sig-foot">${tr('التوقيع والتاريخ', 'Signature & Date')}</div>
          </div>`;
        })
        .join('')}
    </div>
  `;

  // Issuance details (if approved and present)
  const iss = request.issuance;
  const issuanceHtml =
    request.status === 'approved' && iss
      ? `<div class="section-title">${tr('5. بيانات الإصدار النهائي', '5. Final Issuance Details')}</div>
         <div class="issuance-box">
           <table class="fields">
             ${fieldRow(tr('رقم البطاقة', 'Card No.'), iss.cardNumber)}
             ${fieldRow(tr('التسلسل', 'Serial'), iss.serial)}
             ${fieldRow(tr('تاريخ الإصدار', 'Issue Date'), iss.issueDate)}
             ${fieldRow(tr('تاريخ الانتهاء', 'Expiry Date'), iss.expiryDate)}
             ${fieldRow(tr('أخذت البصمة', 'Fingerprint Taken'), iss.fingerprintTaken ? tr('نعم', 'Yes') : tr('لا', 'No'))}
             ${fieldRow(tr('الإرشادات والتعليمات', 'Instructions Given'), iss.instructionsGiven ? tr('نعم', 'Yes') : tr('لا', 'No'))}
             ${fieldRow(tr('إدخال البيانات في الحاسب الآلي', 'Data Entered in System'), iss.dataEntered ? tr('نعم', 'Yes') : tr('لا', 'No'))}
             ${fieldRow(tr('بواسطة', 'Issued By'), iss.issuedByName)}
           </table>
         </div>`
      : '';

  const statusClass = request.status === 'approved' ? 'status-approved' : 'status-other';
  const statusBadge = `<div class="status-wrap"><span class="status-badge ${statusClass}">${request.status === 'approved' ? '✓ ' : ''}${escapeHtml(statusLabel.toUpperCase())}</span></div>`;

  // Page 1
  let html = styles + `<div class="pdf-page">
    ${headerHtml}
    <div class="title-bar">${tr('نموذج طلب إصدار بطاقة هوية', 'ID CARD REQUEST FORM')}</div>
    <div class="meta">
      <span>${tr('التاريخ', 'Date')}: ${new Date(request.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB')}</span>
      <span>${tr('الحالة', 'Status')}: ${escapeHtml(statusLabel)}</span>
    </div>
    <div class="section-title">${tr('1. بيانات الطلب والموظف', '1. Request & Employee Information')}</div>
    ${fieldsTable}
    <div class="section-title">${tr('2. بيانات التقديم', '2. Submission Details')}</div>
    ${submitTable}
    <div class="section-title">${tr('3. المرفقات المقدمة', '3. Submitted Attachments')}</div>
    ${attChecklist}
    <div class="section-title">${tr('4. الموافقات والتواقيع', '4. Approvals & Signatures')}</div>
    ${signaturesHtml}
    ${issuanceHtml}
    ${statusBadge}
    ${footerHtml}
  </div>`;

  // Attachment pages
  for (let i = 0; i < request.attachments.length; i++) {
    const att = request.attachments[i];
    if (!att.data) continue;
    let body = '';
    if (att.type.startsWith('image/')) {
      body = `<img class="att-img" src="${att.data}" />`;
    } else if (att.type === 'application/pdf') {
      body = `<div style="background:#f0f4f8;border-radius:6px;padding:40px;text-align:center;margin-top:20px">
        <h2 style="color:#1a365d">${tr('ملف PDF مرفق', 'PDF Document Attached')}</h2>
        <p style="color:#475569;margin-top:10px">${tr('يرجى تحميل الملف الأصلي من النظام لعرضه.', 'Please download the original file from the system to view its contents.')}</p>
        <p style="margin-top:8px;color:#64748b">${escapeHtml(att.name)}</p>
      </div>`;
    } else {
      body = `<p style="padding:20px;color:#475569">${tr('ملف', 'File')}: ${escapeHtml(att.name)} (${escapeHtml(att.type)})</p>`;
    }
    html += `<div class="pdf-page">
      ${headerHtml}
      <div class="att-title">${tr('المرفق', 'ATTACHMENT')} ${i + 1} / ${request.attachments.length}: ${escapeHtml(att.name)}</div>
      ${body}
      ${footerHtml}
    </div>`;
  }

  await renderHtmlToPdf(html, `${request.requestNumber}.pdf`);
}
