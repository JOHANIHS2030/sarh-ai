import jsPDF from 'jspdf';
import { IDCardRequest, Department, User } from '@/types';
import { CompanySettings } from '@/contexts/CompanyContext';

interface GenerateArgs {
  request: IDCardRequest;
  department?: Department;
  creator?: User;
  company: CompanySettings;
  language: 'ar' | 'en';
  statusLabel: string;
}

// Helper to load image as data URL & dimensions
function loadImage(src: string): Promise<{ data: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ data: src, w: img.width, h: img.height });
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateRequestPDF({ request, department, creator, company, language, statusLabel }: GenerateArgs) {
  const isAr = language === 'ar';
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 12;

  // ===== Header =====
  let y = margin;

  // Logo
  if (company.logo) {
    try {
      pdf.addImage(company.logo, 'PNG', margin, y, 22, 22);
    } catch {}
  }

  pdf.setFontSize(14);
  pdf.setTextColor(26, 54, 93);
  pdf.setFont('helvetica', 'bold');
  pdf.text(company.nameEn, pageW / 2, y + 8, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100);
  pdf.text(company.addressEn, pageW / 2, y + 14, { align: 'center' });
  pdf.setFontSize(9);
  pdf.text(`${company.phone}  |  ${company.email}`, pageW / 2, y + 19, { align: 'center' });

  // Right corner: request number
  pdf.setFontSize(9);
  pdf.setTextColor(80);
  pdf.text(isAr ? 'Request No.' : 'Request No.', pageW - margin, y + 6, { align: 'right' });
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(26, 54, 93);
  pdf.text(request.requestNumber, pageW - margin, y + 12, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text(`Date: ${new Date(request.createdAt).toLocaleDateString('en-GB')}`, pageW - margin, y + 17, { align: 'right' });

  y += 26;
  pdf.setDrawColor(26, 54, 93);
  pdf.setLineWidth(0.6);
  pdf.line(margin, y, pageW - margin, y);
  y += 6;

  // ===== Title =====
  pdf.setFontSize(13);
  pdf.setTextColor(26, 54, 93);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ID CARD REQUEST FORM', pageW / 2, y, { align: 'center' });
  y += 7;

  // ===== Data table =====
  const rows: [string, string][] = [
    ['Employee Type', request.employeeType === 'direct' ? 'Direct Employee' : 'Contractor Employee'],
    ['Department', department?.nameEn || '—'],
    ['Name (English)', request.nameEn],
    ['Name (Arabic)', request.nameAr],
    ['Nationality', request.nationality],
    ['ID Number', request.employeeId],
    ['Job Title', request.jobTitle],
    ['National ID No.', request.nationalIdNo],
    ['Date & Issue Place', request.dateIssuePlace],
    ['Birth Date', request.birthDate],
    ['Blood Type', request.bloodType],
    ['Company Name & Tel.', request.companyNameTel],
    ['Submitted By', creator ? creator.nameEn : (request.createdBy === 'external' ? 'External Form' : '')],
    ['Status', statusLabel],
  ];

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const colLabelW = 55;
  const rowH = 6.5;
  rows.forEach(([label, value]) => {
    pdf.setFillColor(240, 244, 248);
    pdf.rect(margin, y, colLabelW, rowH, 'F');
    pdf.setDrawColor(200);
    pdf.rect(margin, y, colLabelW, rowH);
    pdf.rect(margin + colLabelW, y, pageW - 2 * margin - colLabelW, rowH);
    pdf.setTextColor(26, 54, 93);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, margin + 2, y + 4.5);
    pdf.setTextColor(40);
    pdf.setFont('helvetica', 'normal');
    const text = String(value || '—').slice(0, 80);
    pdf.text(text, margin + colLabelW + 2, y + 4.5);
    y += rowH;
  });

  y += 4;

  // ===== Approval signatures =====
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(26, 54, 93);
  pdf.text('Signatures', margin, y);
  y += 5;

  const sigBoxW = (pageW - 2 * margin - 10) / 3;
  const sigBoxH = 22;
  const sigLabels = ['Department Manager', 'Safety Team', 'ID Card Section'];
  sigLabels.forEach((label, i) => {
    const x = margin + i * (sigBoxW + 5);
    pdf.setDrawColor(180);
    pdf.rect(x, y, sigBoxW, sigBoxH);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, x + sigBoxW / 2, y + sigBoxH - 2, { align: 'center' });
  });

  // place signatures from approval history
  request.approvalHistory.forEach((h) => {
    let idx = -1;
    if (h.stage === 'pending_dept_approval') idx = 0;
    else if (h.stage === 'pending_safety_approval') idx = 1;
    else if (h.stage === 'pending_id_review') idx = 2;
    if (idx < 0 || h.action !== 'approve') return;
    const x = margin + idx * (sigBoxW + 5);
    pdf.setFontSize(7);
    pdf.setTextColor(26, 100, 26);
    pdf.text(`✓ Approved`, x + 2, y + 4);
    pdf.text(new Date(h.timestamp).toLocaleDateString('en-GB'), x + 2, y + 8);
  });

  y += sigBoxH + 6;

  // Status badge
  pdf.setFontSize(10);
  pdf.setFillColor(212, 237, 218);
  pdf.setTextColor(21, 87, 36);
  pdf.roundedRect(pageW / 2 - 25, y, 50, 8, 2, 2, 'F');
  pdf.text(statusLabel, pageW / 2, y + 5.5, { align: 'center' });

  // ===== Attachments — separate pages =====
  for (const att of request.attachments) {
    if (!att.data) continue;
    pdf.addPage();
    pdf.setFontSize(12);
    pdf.setTextColor(26, 54, 93);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Attachment: ${att.name}`, margin, margin + 5);
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Request: ${request.requestNumber}`, margin, margin + 11);
    pdf.setDrawColor(26, 54, 93);
    pdf.line(margin, margin + 14, pageW - margin, margin + 14);

    if (att.type.startsWith('image/')) {
      try {
        const img = await loadImage(att.data);
        const maxW = pageW - 2 * margin;
        const maxH = pageH - margin - 25;
        const ratio = Math.min(maxW / img.w, maxH / img.h);
        const w = img.w * ratio;
        const h = img.h * ratio;
        pdf.addImage(att.data, margin + (maxW - w) / 2, margin + 18, w, h, undefined, 'FAST');
      } catch {
        pdf.text('(Could not embed image)', margin, margin + 25);
      }
    } else if (att.type === 'application/pdf') {
      pdf.setFontSize(10);
      pdf.setTextColor(80);
      pdf.text('PDF attachment — please download from the system to view.', margin, margin + 25);
      pdf.text(`File name: ${att.name}`, margin, margin + 32);
    } else {
      pdf.setFontSize(10);
      pdf.text(`File: ${att.name} (${att.type})`, margin, margin + 25);
    }
  }

  pdf.save(`${request.requestNumber}.pdf`);
}
