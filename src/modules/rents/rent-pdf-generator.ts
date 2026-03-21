import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Rent } from './rent.entity';

export async function generateRentAgreementPdf(rent: Rent): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `agreement-rent-${rent.id}.pdf`;
    const filepath = path.join(process.cwd(), 'uploads', filename);
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('RENTAL AGREEMENT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Rent ID: ${rent.id}`, { align: 'center' });
    doc.moveDown(2);

    // Parties
    doc.fontSize(14).font('Helvetica-Bold').text('PARTIES');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Property Owner: ${rent.owner?.firstName} ${rent.owner?.lastName}`);
    doc.text(`Tenant: ${rent.tenant?.firstName} ${rent.tenant?.lastName}`);
    doc.moveDown();

    // Property
    doc.fontSize(14).font('Helvetica-Bold').text('PROPERTY');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Title: ${rent.property?.title}`);
    doc.text(`Address: ${rent.property?.address}, ${rent.property?.city}, ${rent.property?.state}`);
    doc.moveDown();

    // Terms
    doc.fontSize(14).font('Helvetica-Bold').text('TERMS');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Rent Amount: NGN ${Number(rent.rentAmount).toLocaleString()} (${rent.rentPeriod})`);
    if (rent.cautionDeposit) {
      doc.text(`Caution Deposit: NGN ${Number(rent.cautionDeposit).toLocaleString()}`);
    }
    doc.text(`Start Date: ${rent.startDate}`);
    doc.text(`Next Due Date: ${rent.nextDueDate}`);
    doc.moveDown();

    if (rent.additionalTerms) {
      doc.fontSize(14).font('Helvetica-Bold').text('ADDITIONAL TERMS');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(rent.additionalTerms);
      doc.moveDown();
    }

    // Signatures
    doc.fontSize(14).font('Helvetica-Bold').text('SIGNATURES');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    if (rent.tenantSignedAt) {
      doc.text(`Tenant Signed: ${rent.tenantSignedAt.toISOString()}`);
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
