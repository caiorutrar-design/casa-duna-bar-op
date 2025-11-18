import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, HeadingLevel, AlignmentType, WidthType, ImageRun } from 'docx';
import html2canvas from 'html2canvas';

export interface ChartExportConfig {
  elementId: string;
  title: string;
}

export interface ExportData {
  title: string;
  period?: string;
  data: { [key: string]: any };
  tables?: { title: string; headers: string[]; rows: (string | number)[][] }[];
  charts?: ChartExportConfig[];
}

// Capture chart as image
export const captureChartAsImage = async (elementId: string): Promise<string> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Chart element with id ${elementId} not found`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
  });

  return canvas.toDataURL('image/png');
};

// Export to PDF
export const exportToPDF = async (data: ExportData) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.text(data.title, 14, yPosition);
  yPosition += 10;

  // Period
  if (data.period) {
    doc.setFontSize(12);
    doc.text(data.period, 14, yPosition);
    yPosition += 10;
  }

  // Summary data
  doc.setFontSize(10);
  Object.entries(data.data).forEach(([key, value]) => {
    doc.text(`${key}: ${value}`, 14, yPosition);
    yPosition += 7;
  });

  yPosition += 5;

  // Tables
  if (data.tables) {
    for (const table of data.tables) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.text(table.title, 14, yPosition);
      yPosition += 7;

      autoTable(doc, {
        startY: yPosition,
        head: [table.headers],
        body: table.rows,
        margin: { left: 14 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Charts
  if (data.charts) {
    for (const chart of data.charts) {
      try {
        const imageData = await captureChartAsImage(chart.elementId);
        
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.text(chart.title, 14, yPosition);
        yPosition += 7;

        const imgWidth = 180;
        const imgHeight = 100;
        doc.addImage(imageData, 'PNG', 14, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      } catch (error) {
        console.error(`Error capturing chart ${chart.elementId}:`, error);
      }
    }
  }

  doc.save(`${data.title.replace(/\s+/g, '_')}.pdf`);
};

// Export to Excel
export const exportToExcel = (data: ExportData) => {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = Object.entries(data.data).map(([key, value]) => ({
    Métrica: key,
    Valor: value,
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  // Additional tables
  if (data.tables) {
    data.tables.forEach((table, index) => {
      const tableData = table.rows.map((row) => {
        const rowObj: any = {};
        table.headers.forEach((header, i) => {
          rowObj[header] = row[i];
        });
        return rowObj;
      });
      const sheet = XLSX.utils.json_to_sheet(tableData);
      const sheetName = table.title.substring(0, 31); // Excel sheet name limit
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });
  }

  XLSX.writeFile(workbook, `${data.title.replace(/\s+/g, '_')}.xlsx`);
};

// Export to Word
export const exportToWord = async (data: ExportData) => {
  const sections: any[] = [];

  // Title
  sections.push(
    new Paragraph({
      text: data.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  // Period
  if (data.period) {
    sections.push(
      new Paragraph({
        text: data.period,
        spacing: { after: 200 },
      })
    );
  }

  // Summary data
  sections.push(
    new Paragraph({
      text: 'Resumo',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 200 },
    })
  );

  Object.entries(data.data).forEach(([key, value]) => {
    sections.push(
      new Paragraph({
        text: `${key}: ${value}`,
        spacing: { after: 100 },
      })
    );
  });

  // Tables
  if (data.tables) {
    for (const table of data.tables) {
      sections.push(
        new Paragraph({
          text: table.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      const tableRows = [
        new TableRow({
          children: table.headers.map(
            (header) =>
              new TableCell({
                children: [new Paragraph({ text: header, bold: true })],
                width: { size: 100 / table.headers.length, type: WidthType.PERCENTAGE },
              })
          ),
        }),
        ...table.rows.map(
          (row) =>
            new TableRow({
              children: row.map(
                (cell) =>
                  new TableCell({
                    children: [new Paragraph(String(cell))],
                    width: { size: 100 / table.headers.length, type: WidthType.PERCENTAGE },
                  })
              ),
            })
        ),
      ];

      sections.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }
  }

  // Charts
  if (data.charts) {
    for (const chart of data.charts) {
      try {
        const imageData = await captureChartAsImage(chart.elementId);
        const base64Data = imageData.split(',')[1];

        sections.push(
          new Paragraph({
            text: chart.title,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          })
        );

        sections.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)),
                transformation: {
                  width: 600,
                  height: 350,
                },
              }),
            ],
          })
        );
      } catch (error) {
        console.error(`Error capturing chart ${chart.elementId}:`, error);
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        children: sections,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.title.replace(/\s+/g, '_')}.docx`;
  link.click();
  URL.revokeObjectURL(url);
};
