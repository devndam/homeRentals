import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Invoice } from './invoice.entity';

export async function generateAgreementPdf(invoice: Invoice): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `agreement-${invoice.id}.pdf`;
    const filepath = path.join(process.cwd(), 'uploads', filename);
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('RENTAL AGREEMENT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Invoice ID: ${invoice.id}`, { align: 'center' });
    doc.moveDown(2);

    // Parties
    doc.fontSize(14).font('Helvetica-Bold').text('PARTIES');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Property Owner: ${invoice.owner?.firstName} ${invoice.owner?.lastName}`);
    doc.text(`Tenant: ${invoice.tenant?.firstName} ${invoice.tenant?.lastName}`);
    doc.moveDown();

    // Property
    doc.fontSize(14).font('Helvetica-Bold').text('PROPERTY');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Title: ${invoice.property?.title}`);
    doc.text(`Address: ${invoice.property?.address}, ${invoice.property?.city}, ${invoice.property?.state}`);
    doc.moveDown();

    // Terms
    doc.fontSize(14).font('Helvetica-Bold').text('TERMS');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Rent Amount: NGN ${Number(invoice.rentAmount).toLocaleString()} (${invoice.rentPeriod})`);
    if (invoice.units > 1) {
      doc.text(`Number of Units: ${invoice.units}`);
    }
    if (invoice.cautionDeposit) {
      doc.text(`Caution Deposit: NGN ${Number(invoice.cautionDeposit).toLocaleString()}`);
    }
    doc.text(`Start Date: ${invoice.startDate}`);
    doc.text(`End Date: ${invoice.endDate}`);
    doc.moveDown();

    if (invoice.additionalTerms) {
      doc.fontSize(14).font('Helvetica-Bold').text('ADDITIONAL TERMS');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(invoice.additionalTerms);
      doc.moveDown();
    }

    // Signatures
    doc.fontSize(14).font('Helvetica-Bold').text('SIGNATURES');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    if (invoice.tenantSignedAt) {
      doc.text(`Tenant Signed: ${invoice.tenantSignedAt.toISOString()}`);
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#888').text(
      'This document was generated electronically and constitutes a legally binding agreement between the parties.',
      { align: 'center' },
    );

    doc.end();

    stream.on('finish', () => resolve(`/uploads/${filename}`));
    stream.on('error', reject);
  });
}
