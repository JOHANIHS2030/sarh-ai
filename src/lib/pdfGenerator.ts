import jsPDF from 'jspdf';
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

// Brand colors
const BRAND = { r: 26, g: 54, b: 93 };
const GOLD = { r: 184, g: 134, b: 11 };
const LIGHT = { r: 240, g: 244, b: 248 };

// Load image and get dimensions
function loadImage(src: string): Promise<{ data: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ data: src, w: img.width, h: img.height });
    img.onerror = reject;
    img.src = src;
  });
}

// Generate barcode as data URL
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

// Reusable header drawer
function drawHeader(
  pdf: jsPDF,
  pageW: number,
  margin: number,
  company: CompanySettings,
  request: IDCardRequest,
  isAr: boolean,
  barcodeUrl: string
): number {
  let y = margin;

  // Top brand bar
  pdf.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  pdf.rect(0, 0, pageW, 4, 'F');
  pdf.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  pdf.rect(0, 4, pageW, 1, 'F');

  y += 4;

  // Logo on left
  if (company.logo) {
    try {
      pdf.addImage(company.logo, 'PNG', margin, y, 22, 22);
    } catch {}
  }

  // Company center
  pdf.setFontSize(13);
  pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  pdf.setFont('helvetica', 'bold');
  pdf.text(company.nameEn, pageW / 2, y + 7, { align: 'center' });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(90);
  pdf.text(company.addressEn, pageW / 2, y + 12, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text(`${company.phone}  |  ${company.email}  |  ${company.website}`, pageW / 2, y + 16.5, { align: 'center' });

  // Right corner: request number + barcode
  if (barcodeUrl) {
    try {
      pdf.addImage(barcodeUrl, 'PNG', pageW - margin - 45, y + 1, 45, 14);
    } catch {}
  }
  pdf.setFontSize(8);
  pdf.setTextColor(80);
  pdf.text('Request No.', pageW - margin, y + 19, { align: 'right' });
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  pdf.text(request.requestNumber, pageW - margin, y + 23, { align: 'right' });

  y += 26;

  pdf.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageW - margin, y);
  pdf.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y + 0.8, pageW - margin, y + 0.8);

  return y + 5;
}

// Footer
function drawFooter(pdf: jsPDF, pageW: number, pageH: number, margin: number, company: CompanySettings, pageNum: number, totalPages: number) {
  const fy = pageH - 10;
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.2);
  pdf.line(margin, fy - 3, pageW - margin, fy - 3);
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${company.nameEn} — Confidential`, margin, fy);
  pdf.text(`Page ${pageNum} / ${totalPages}`, pageW - margin, fy, { align: 'right' });
  pdf.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageW / 2, fy, { align: 'center' });
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
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 12;

  const barcodeUrl = generateBarcodeDataURL(request.requestNumber);

  // ========== PAGE 1: Main Form ==========
  let y = drawHeader(pdf, pageW, margin, company, request, isAr, barcodeUrl);

  // Title banner
  pdf.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  pdf.roundedRect(margin, y, pageW - 2 * margin, 9, 1.5, 1.5, 'F');
  pdf.setFontSize(12);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ID CARD REQUEST FORM', pageW / 2, y + 6, { align: 'center' });
  y += 13;

  // Meta line
  pdf.setFontSize(8);
  pdf.setTextColor(90);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Date: ${new Date(request.createdAt).toLocaleDateString('en-GB')}`, margin + 2, y);
  pdf.text(
    `Status: ${statusLabel}`,
    pageW - margin - 2,
    y,
    { align: 'right' }
  );
  y += 4;

  // Section: Employee Information
  const drawSectionHeader = (title: string) => {
    pdf.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
    pdf.rect(margin, y, pageW - 2 * margin, 6, 'F');
    pdf.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y + 6, pageW - 2 * margin + margin, y + 6);
    pdf.setFontSize(9);
    pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 2, y + 4.2);
    y += 7;
  };

  // 2-column grid for fields
  const drawFieldGrid = (rows: [string, string][]) => {
    const colW = (pageW - 2 * margin) / 2;
    const labelH = 4.5;
    const valueH = 5.5;
    const cellH = labelH + valueH;

    rows.forEach((row, i) => {
      const col = i % 2;
      const x = margin + col * colW;
      if (col === 0 && i > 0) y += cellH;

      // Label area
      pdf.setFillColor(248, 250, 252);
      pdf.rect(x, y, colW, labelH, 'F');
      pdf.setFontSize(7);
      pdf.setTextColor(100);
      pdf.setFont('helvetica', 'bold');
      pdf.text(row[0].toUpperCase(), x + 2, y + 3.2);

      // Value area
      pdf.setDrawColor(220);
      pdf.setLineWidth(0.1);
      pdf.rect(x, y + labelH, colW, valueH);
      pdf.setFontSize(9);
      pdf.setTextColor(30);
      pdf.setFont('helvetica', 'normal');
      const text = String(row[1] || '—').slice(0, 60);
      pdf.text(text, x + 2, y + labelH + 3.8);
    });
    if (rows.length % 2 !== 0) {
      // close half row
      const x = margin + colW;
      pdf.setFillColor(248, 250, 252);
      pdf.rect(x, y, colW, labelH, 'F');
      pdf.setDrawColor(220);
      pdf.rect(x, y + labelH, colW, valueH);
    }
    y += cellH + 1;
  };

  drawSectionHeader('1. Request & Employee Information');
  drawFieldGrid([
    ['Employee Type', request.employeeType === 'direct' ? 'Direct Employee' : 'Contractor Employee'],
    ['Department', department?.nameEn || '—'],
    ['Name (English)', request.nameEn],
    ['Name (Arabic)', request.nameAr],
    ['Nationality', request.nationality],
    ['ID / Employee Number', request.employeeId],
    ['Job Title', request.jobTitle],
    ['National ID / Iqama No.', request.nationalIdNo],
    ['Date & Issue Place', request.dateIssuePlace],
    ['Birth Date', request.birthDate],
    ['Blood Type', request.bloodType],
    ['Company Name & Tel.', request.companyNameTel],
  ]);

  // Section: Submitter
  drawSectionHeader('2. Submission Details');
  drawFieldGrid([
    ['Submitted By', creator ? creator.nameEn : (request.createdBy === 'external' ? 'External Web Form' : '—')],
    ['Submission Date', new Date(request.createdAt).toLocaleString('en-GB')],
    ['Current Status', statusLabel],
    ['Last Update', new Date(request.updatedAt).toLocaleString('en-GB')],
  ]);

  // Section: Attachments checklist (names only on form page)
  drawSectionHeader('3. Submitted Attachments Checklist');
  if (request.attachments.length === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text('No attachments submitted.', margin + 2, y + 4);
    y += 6;
  } else {
    const attRowH = 5.5;
    request.attachments.forEach((a, i) => {
      const bg = i % 2 === 0 ? [255, 255, 255] : [250, 251, 253];
      pdf.setFillColor(bg[0], bg[1], bg[2]);
      pdf.rect(margin, y, pageW - 2 * margin, attRowH, 'F');
      pdf.setDrawColor(230);
      pdf.setLineWidth(0.1);
      pdf.rect(margin, y, pageW - 2 * margin, attRowH);
      // checkmark
      pdf.setTextColor(21, 128, 61);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('OK', margin + 2, y + 3.8);
      // file name
      pdf.setTextColor(40);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`${i + 1}. ${a.name}`, margin + 12, y + 3.8);
      // type
      pdf.setTextColor(120);
      pdf.text(a.type, pageW - margin - 2, y + 3.8, { align: 'right' });
      y += attRowH;
    });
    y += 1;
  }

  // Section: Approvals & Signatures
  y += 2;
  drawSectionHeader('4. Approvals & Signatures');

  const sigBoxW = (pageW - 2 * margin - 8) / 3;
  const sigBoxH = 32;
  const stages = [
    { key: 'pending_dept_approval', label: 'Department Manager' },
    { key: 'pending_safety_approval', label: 'Safety Team' },
    { key: 'pending_id_review', label: 'ID Card Section' },
  ];

  for (let i = 0; i < stages.length; i++) {
    const x = margin + i * (sigBoxW + 4);
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x, y, sigBoxW, sigBoxH, 1, 1);

    // header strip
    pdf.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
    pdf.rect(x, y, sigBoxW, 5, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    pdf.setFont('helvetica', 'bold');
    pdf.text(stages[i].label, x + sigBoxW / 2, y + 3.5, { align: 'center' });

    // find approval entry
    const entry = request.approvalHistory.find(h => h.stage === stages[i].key && h.action === 'approve');
    const approver = approvers.find(a => a.stage === stages[i].key);

    if (entry && approver?.user) {
      // signature image
      if (approver.user.signature) {
        try {
          const sigImg = await loadImage(approver.user.signature);
          const maxW = sigBoxW - 6;
          const maxH = 14;
          const ratio = Math.min(maxW / sigImg.w, maxH / sigImg.h);
          const w = sigImg.w * ratio;
          const h = sigImg.h * ratio;
          pdf.addImage(approver.user.signature, x + (sigBoxW - w) / 2, y + 7, w, h);
        } catch {}
      }
      // Name + date
      pdf.setFontSize(7);
      pdf.setTextColor(40);
      pdf.setFont('helvetica', 'bold');
      pdf.text(approver.user.nameEn, x + sigBoxW / 2, y + sigBoxH - 7, { align: 'center', maxWidth: sigBoxW - 4 });
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      pdf.text(new Date(entry.timestamp).toLocaleDateString('en-GB'), x + sigBoxW / 2, y + sigBoxH - 3, { align: 'center' });
      // Approved stamp
      pdf.setTextColor(21, 128, 61);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text('APPROVED', x + sigBoxW - 3, y + 9, { align: 'right' });
    } else {
      pdf.setFontSize(7);
      pdf.setTextColor(160);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Pending signature', x + sigBoxW / 2, y + sigBoxH / 2, { align: 'center' });
      pdf.setDrawColor(200);
      pdf.line(x + 4, y + sigBoxH - 6, x + sigBoxW - 4, y + sigBoxH - 6);
      pdf.setFontSize(6);
      pdf.text('Signature & Date', x + sigBoxW / 2, y + sigBoxH - 3, { align: 'center' });
    }
  }
  y += sigBoxH + 4;

  // Final status badge
  const finalApproved = request.status === 'approved';
  if (finalApproved) {
    pdf.setFillColor(212, 237, 218);
    pdf.setDrawColor(21, 128, 61);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(pageW / 2 - 30, y, 60, 9, 2, 2, 'FD');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(21, 128, 61);
    pdf.text(`✓ ${statusLabel.toUpperCase()}`, pageW / 2, y + 6, { align: 'center' });
  } else {
    pdf.setFillColor(255, 243, 205);
    pdf.setDrawColor(184, 134, 11);
    pdf.roundedRect(pageW / 2 - 30, y, 60, 9, 2, 2, 'FD');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(133, 100, 4);
    pdf.text(statusLabel.toUpperCase(), pageW / 2, y + 6, { align: 'center' });
  }

  // ========== Attachment pages ==========
  for (let i = 0; i < request.attachments.length; i++) {
    const att = request.attachments[i];
    if (!att.data) continue;
    pdf.addPage();
    let ay = drawHeader(pdf, pageW, margin, company, request, isAr, barcodeUrl);

    // Attachment title bar
    pdf.setFillColor(GOLD.r, GOLD.g, GOLD.b);
    pdf.roundedRect(margin, ay, pageW - 2 * margin, 9, 1.5, 1.5, 'F');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`ATTACHMENT ${i + 1} OF ${request.attachments.length}`, pageW / 2, ay + 6, { align: 'center' });
    ay += 12;

    pdf.setFontSize(10);
    pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    pdf.setFont('helvetica', 'bold');
    pdf.text(att.name, margin, ay);
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Type: ${att.type}`, margin, ay + 4.5);
    ay += 7;

    if (att.type.startsWith('image/')) {
      try {
        const img = await loadImage(att.data);
        const maxW = pageW - 2 * margin;
        const maxH = pageH - ay - 18;
        const ratio = Math.min(maxW / img.w, maxH / img.h);
        const w = img.w * ratio;
        const h = img.h * ratio;
        // border around image
        pdf.setDrawColor(200);
        pdf.setLineWidth(0.3);
        pdf.rect(margin + (maxW - w) / 2 - 1, ay - 1, w + 2, h + 2);
        pdf.addImage(att.data, margin + (maxW - w) / 2, ay, w, h, undefined, 'FAST');
      } catch {
        pdf.setFontSize(10);
        pdf.setTextColor(80);
        pdf.text('(Could not embed image preview)', margin, ay + 10);
      }
    } else if (att.type === 'application/pdf') {
      pdf.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
      pdf.roundedRect(margin, ay, pageW - 2 * margin, 40, 2, 2, 'F');
      pdf.setFontSize(11);
      pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PDF Document Attached', pageW / 2, ay + 15, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setTextColor(80);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Please download the original file from the system to view its contents.', pageW / 2, ay + 23, { align: 'center' });
      pdf.text(`File name: ${att.name}`, pageW / 2, ay + 30, { align: 'center' });
    } else {
      pdf.setFontSize(10);
      pdf.setTextColor(80);
      pdf.text(`File: ${att.name} (${att.type})`, margin, ay + 10);
    }
  }

  // ========== Add footers to all pages ==========
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    drawFooter(pdf, pageW, pageH, margin, company, p, totalPages);
  }

  pdf.save(`${request.requestNumber}.pdf`);
}
