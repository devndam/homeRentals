import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Agreement } from './agreement.entity';

export async function generateAgreementPdf(agreement: Agreement): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `agreement-${agreement.id}.pdf`;
    const filepath = path.join(process.cwd(), 'uploads', filename);
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('RENTAL AGREEMENT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Agreement ID: ${agreement.id}`, { align: 'center' });
    doc.moveDown(2);

    // Parties
    doc.fontSize(14).font('Helvetica-Bold').text('PARTIES');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Landlord: ${agreement.landlord?.firstName} ${agreement.landlord?.lastName}`);
    doc.text(`Tenant: ${agreement.tenant?.firstName} ${agreement.tenant?.lastName}`);
    doc.moveDown();

    // Property
    doc.fontSize(14).font('Helvetica-Bold').text('PROPERTY');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Title: ${agreement.property?.title}`);
    doc.text(`Address: ${agreement.property?.address}, ${agreement.property?.city}, ${agreement.property?.state}`);
    doc.moveDown();

    // Terms
    doc.fontSize(14).font('Helvetica-Bold').text('TERMS');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Rent Amount: NGN ${Number(agreement.rentAmount).toLocaleString()} (${agreement.rentPeriod})`);
    if (agreement.cautionDeposit) {
      doc.text(`Caution Deposit: NGN ${Number(agreement.cautionDeposit).toLocaleString()}`);
    }
    doc.text(`Start Date: ${agreement.startDate}`);
    doc.text(`End Date: ${agreement.endDate}`);
    doc.moveDown();

    if (agreement.additionalTerms) {
      doc.fontSize(14).font('Helvetica-Bold').text('ADDITIONAL TERMS');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(agreement.additionalTerms);
      doc.moveDown();
    }

    // Signatures
    doc.fontSize(14).font('Helvetica-Bold').text('SIGNATURES');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');

    if (agreement.tenantSignedAt) {
      doc.text(`Tenant Signed: ${agreement.tenantSignedAt.toISOString()}`);
    }
    if (agreement.landlordSignedAt) {
      doc.text(`Landlord Signed: ${agreement.landlordSignedAt.toISOString()}`);
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
