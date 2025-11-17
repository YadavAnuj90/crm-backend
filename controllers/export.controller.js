
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const Ticket = require("../models/ticket.model");

exports.exportExcel = async (req, res) => {
  try {
    const tickets = await Ticket.find();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Tickets");

    sheet.columns = [
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 40 },
      { header: "Priority", key: "ticketPriority", width: 10 },
      { header: "Status", key: "ticketStatus", width: 10 },
      { header: "Reported By", key: "reportedBy", width: 15 },
      { header: "Assigned To", key: "assignedTo", width: 15 }
    ];

    tickets.forEach(t => sheet.addRow(t));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=tickets.xlsx");

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    res.status(500).send({ message: "Excel export failed" });
  }
};

exports.exportPDF = async (req, res) => {
  try {
    const tickets = await Ticket.find();

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=tickets.pdf");

    doc.pipe(res);

    doc.fontSize(20).text("Ticket Report", { align: "center" });

    tickets.forEach((t) => {
      doc.moveDown().fontSize(12).text(`
Title: ${t.title}
Description: ${t.description}
Priority: ${t.ticketPriority}
Status: ${t.ticketStatus}
Reported By: ${t.reportedBy}
Assigned To: ${t.assignedTo}
-----------------------------
      `);
    });

    doc.end();
  } catch (error) {
    res.status(500).send({ message: "PDF export failed" });
  }
};
