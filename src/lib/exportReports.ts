// Generic PDF + Excel export utilities for admin reports.
// PDF: rendered via html2canvas (same approach as form generators) so Arabic
// text is shaped correctly and bundled Cairo font is used.
// Excel: via the xlsx package — produces .xlsx with a single sheet.

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export interface ReportColumn<T> {
  key: string;
  header: string;       // already translated
  accessor: (row: T) => string | number;
}

export async function exportReportToPDF<T>(args: {
  title: string;          // already translated
  subtitle?: string;
  columns: ReportColumn<T>[];
  rows: T[];
  fileName: string;
  language: 'ar' | 'en';
  companyName?: string;
  companyLogo?: string;
}) {
  const { title, subtitle, columns, rows, fileName, language, companyName, companyLogo } = args;
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  const html = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .page {
        width: 1123px; min-height: 794px; padding: 24px 28px; background: #fff;
        font-family: 'Cairo', 'Noto Naskh Arabic', 'Segoe UI', Tahoma, sans-serif;
        font-feature-settings: "kern", "liga", "calt";
        text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased;
        color: #1a1a1a; direction: ${dir};
      }
      .hdr { display:flex; align-items:center; justify-content:space-between; border-bottom: 2px solid #1a365d; padding-bottom:10px; margin-bottom:14px; }
      .hdr .title { color:#1a365d; font-size:18px; font-weight:700; }
      .hdr .sub { color:#475569; font-size:11px; margin-top:2px; }
      .hdr img { max-height:48px; }
      table { width:100%; border-collapse:collapse; }
      th { background:#1a365d; color:#fff; padding:8px 6px; font-size:11px; text-align:${isAr ? 'right' : 'left'}; font-weight:700; }
      td { border:1px solid #e2e8f0; padding:6px; font-size:10px; color:#1f2937; vertical-align:middle; }
      tr:nth-child(even) td { background:#f8fafc; }
      .meta { font-size:10px; color:#64748b; margin-bottom:10px; display:flex; justify-content:space-between; }
      .empty { padding:24px; text-align:center; color:#94a3b8; font-size:12px; }
    </style>
    <div class="page">
      <div class="hdr">
        <div>
          <div class="title">${title}</div>
          ${subtitle ? `<div class="sub">${subtitle}</div>` : ''}
        </div>
        ${companyLogo ? `<img src="${companyLogo}" />` : `<div class="title">${companyName || ''}</div>`}
      </div>
      <div class="meta">
        <span>${isAr ? 'إجمالي السجلات' : 'Total records'}: ${rows.length}</span>
        <span>${isAr ? 'تاريخ التصدير' : 'Generated'}: ${new Date().toLocaleString(isAr ? 'ar-SA' : 'en-GB')}</span>
      </div>
      ${rows.length === 0
        ? `<div class="empty">${isAr ? 'لا توجد سجلات لعرضها' : 'No records to display'}</div>`
        : `<table>
            <thead><tr>${columns.map(c => `<th>${escape(c.header)}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map(r => `<tr>${columns.map(c => `<td>${escape(String(c.accessor(r) ?? '—'))}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>`}
    </div>
  `;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const sample = 'النموذج العربي ABC';
    await Promise.all(['400', '600', '700'].map(w => (document as any).fonts.load(`${w} 14px "Cairo"`, sample)));
    await (document as any).fonts.ready;
    await new Promise(r => setTimeout(r, 50));
  } catch { /* ignore */ }

  const page = container.querySelector('.page') as HTMLElement;
  const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297, pageH = 210;
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  if (imgH <= pageH) {
    pdf.addImage(dataUrl, 'JPEG', 0, 0, imgW, imgH);
  } else {
    // multi-page: slice the canvas
    const sliceHeightPx = (pageH * canvas.width) / pageW;
    let y = 0;
    while (y < canvas.height) {
      const h = Math.min(sliceHeightPx, canvas.height - y);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = h;
      const ctx = slice.getContext('2d')!;
      ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      const sd = slice.toDataURL('image/jpeg', 0.92);
      if (y > 0) pdf.addPage();
      pdf.addImage(sd, 'JPEG', 0, 0, pageW, (h * pageW) / canvas.width);
      y += h;
    }
  }
  document.body.removeChild(container);
  pdf.save(fileName);
}

export function exportReportToExcel<T>(args: {
  title: string;
  columns: ReportColumn<T>[];
  rows: T[];
  fileName: string;
}) {
  const { columns, rows, fileName, title } = args;
  const aoa: (string | number)[][] = [];
  aoa.push(columns.map(c => c.header));
  rows.forEach(r => aoa.push(columns.map(c => c.accessor(r))));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Auto-size columns
  ws['!cols'] = columns.map(c => ({ wch: Math.max(12, c.header.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 28) || 'Report');
  XLSX.writeFile(wb, fileName);
}

function escape(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
