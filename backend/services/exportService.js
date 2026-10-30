// ============================================================
// Export Service — services/exportService.js
// Generates PDF, Excel, CSV reports from notification logs
// ============================================================

const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { Parser: CsvParser } = require("json2csv");
const NotificationLog = require("../models/NotificationLog");

// ── Build filter query from params ────────────────────────────
function buildQuery({ dateFrom, dateTo, channel }) {
  const query = {};

  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  }

  if (channel && channel !== "all") {
    query.channel = channel;
  }

  return query;
}

// ── Fetch filtered logs ───────────────────────────────────────
async function getFilteredLogs(filters) {
  const query = buildQuery(filters);
  return await NotificationLog.find(query)
    .sort({ date: -1 })
    .populate("emailId", "subject from aiCategory")
    .lean();
}

// ── Generate PDF ──────────────────────────────────────────────
async function generatePDF(filters, res) {
  const logs = await getFilteredLogs(filters);

  const doc = new PDFDocument({ margin: 40, size: "A4" });

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=notification_report_${Date.now()}.pdf`
  );

  doc.pipe(res);

  // Title
  doc.fontSize(22).fillColor("#4F46E5").text("Email to SMS - Notification Report", {
    align: "center",
  });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#94A3B8").text(
    `Generated: ${new Date().toLocaleString()} | Total Records: ${logs.length}`,
    { align: "center" }
  );
  doc.moveDown(1);

  // Filters summary
  doc.fontSize(10).fillColor("#334155");
  if (filters.dateFrom || filters.dateTo) {
    doc.text(`Date Range: ${filters.dateFrom || "Start"} to ${filters.dateTo || "Now"}`);
  }
  if (filters.channel && filters.channel !== "all") {
    doc.text(`Channel: ${filters.channel.toUpperCase()}`);
  }
  doc.moveDown(1);

  // Separator line
  doc.strokeColor("#334155").lineWidth(0.5)
    .moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  const col = { date: 40, channel: 160, status: 240, recipient: 310, message: 420 };

  doc.fontSize(9).fillColor("#4F46E5").font("Helvetica-Bold");
  doc.text("Date", col.date, tableTop);
  doc.text("Channel", col.channel, tableTop);
  doc.text("Status", col.status, tableTop);
  doc.text("Recipient", col.recipient, tableTop);
  doc.text("Message", col.message, tableTop);
  doc.moveDown(0.5);

  doc.strokeColor("#E2E8F0").lineWidth(0.3)
    .moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  // Table rows
  doc.font("Helvetica").fontSize(8).fillColor("#1E293B");

  for (const log of logs) {
    if (doc.y > 750) {
      doc.addPage();
    }

    const y = doc.y;
    const dateStr = new Date(log.date).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

    doc.text(dateStr, col.date, y, { width: 110 });
    doc.text(log.channel.toUpperCase(), col.channel, y);

    // Color-code status
    doc.fillColor(log.status === "SUCCESS" ? "#10B981" : "#EF4444");
    doc.text(log.status, col.status, y);
    doc.fillColor("#1E293B");

    doc.text((log.recipient || "").substring(0, 15), col.recipient, y, { width: 100 });
    doc.text((log.message || "").substring(0, 25), col.message, y, { width: 135 });
    doc.moveDown(0.6);
  }

  if (logs.length === 0) {
    doc.moveDown(2);
    doc.fontSize(12).fillColor("#94A3B8").text("No records found for the selected filters.", {
      align: "center",
    });
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).fillColor("#94A3B8").text(
    "Email to SMS Converter — SanTam NetAlert | MCA Mini Project 2",
    { align: "center" }
  );

  doc.end();
}

// ── Generate Excel ────────────────────────────────────────────
async function generateExcel(filters, res) {
  const logs = await getFilteredLogs(filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Email to SMS Converter";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Notification Logs", {
    headerFooter: {
      firstHeader: "Email to SMS — Notification Report",
    },
  });

  // Define columns
  worksheet.columns = [
    { header: "Date", key: "date", width: 22 },
    { header: "Channel", key: "channel", width: 12 },
    { header: "Status", key: "status", width: 10 },
    { header: "Recipient", key: "recipient", width: 20 },
    { header: "Message", key: "message", width: 35 },
    { header: "Email Subject", key: "emailSubject", width: 30 },
    { header: "Email From", key: "emailFrom", width: 25 },
    { header: "AI Category", key: "aiCategory", width: 14 },
    { header: "Error", key: "error", width: 30 },
  ];

  // Style header row
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Add data rows
  for (const log of logs) {
    worksheet.addRow({
      date: new Date(log.date).toLocaleString(),
      channel: log.channel.toUpperCase(),
      status: log.status,
      recipient: log.recipient || "",
      message: log.message || "",
      emailSubject: log.emailId?.subject || "",
      emailFrom: log.emailId?.from || "",
      aiCategory: log.emailId?.aiCategory || "",
      error: log.error || "",
    });
  }

  // Auto-filter
  worksheet.autoFilter = {
    from: "A1",
    to: `I${logs.length + 1}`,
  };

  // Conditional formatting for status
  worksheet.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      const statusCell = row.getCell("status");
      if (statusCell.value === "SUCCESS") {
        statusCell.font = { color: { argb: "FF10B981" }, bold: true };
      } else if (statusCell.value === "FAILED") {
        statusCell.font = { color: { argb: "FFEF4444" }, bold: true };
      }
    }
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=notification_report_${Date.now()}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
}

// ── Generate CSV ──────────────────────────────────────────────
async function generateCSV(filters, res) {
  const logs = await getFilteredLogs(filters);

  const fields = [
    { label: "Date", value: (row) => new Date(row.date).toLocaleString() },
    { label: "Channel", value: (row) => row.channel.toUpperCase() },
    { label: "Status", value: "status" },
    { label: "Recipient", value: "recipient" },
    { label: "Message", value: "message" },
    { label: "Email Subject", value: (row) => row.emailId?.subject || "" },
    { label: "Email From", value: (row) => row.emailId?.from || "" },
    { label: "AI Category", value: (row) => row.emailId?.aiCategory || "" },
    { label: "Error", value: "error" },
  ];

  const csvParser = new CsvParser({ fields });
  const csv = csvParser.parse(logs);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=notification_report_${Date.now()}.csv`
  );

  res.send(csv);
}

module.exports = {
  generatePDF,
  generateExcel,
  generateCSV,
  getFilteredLogs,
};
