import { IsNull } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { Invoice } from './invoice.entity';
import { Rent } from '../rents/rent.entity';
import { InvoiceStatus, RentStatus } from '../../types';
import { EmailService } from '../../utils/email.service';

const invoiceRepo = () => AppDataSource.getRepository(Invoice);
const rentRepo = () => AppDataSource.getRepository(Rent);

export class RentReminderService {
  private emailService = new EmailService();

  async processReminders(): Promise<{ sent: number }> {
    let sent = 0;

    // ─── Source 1: New Rent records ────────────────────
    const rents = await rentRepo().find({
      where: [
        { status: RentStatus.ACTIVE },
        { status: RentStatus.DUE },
        { status: RentStatus.OVERDUE },
      ],
      relations: ['tenant', 'owner', 'property'],
    });

    for (const rent of rents) {
      sent += await this.sendRemindersFor({
        id: rent.id,
        dueDate: rent.nextDueDate,
        tenantEmail: rent.tenant?.email,
        tenantFirstName: rent.tenant?.firstName || 'Tenant',
        tenantName: `${rent.tenant?.firstName || ''} ${rent.tenant?.lastName || ''}`.trim(),
        ownerEmail: rent.owner?.email,
        ownerFirstName: rent.owner?.firstName || 'Landlord',
        propertyTitle: rent.property?.title || 'Property',
        rentAmount: Number(rent.rentAmount),
        source: 'rent',
      });
    }

    // ─── Source 2: Legacy invoices (no rentId) ─────────
    const legacyInvoices = await invoiceRepo().find({
      where: {
        status: InvoiceStatus.COMPLETED,
        initialPaymentDone: true,
        rentId: IsNull(),
      },
      relations: ['tenant', 'owner', 'property'],
    });

    for (const invoice of legacyInvoices) {
      if (!invoice.nextRentDueDate) continue;

      sent += await this.sendRemindersFor({
        id: invoice.id,
        dueDate: invoice.nextRentDueDate,
        tenantEmail: invoice.tenant?.email,
        tenantFirstName: invoice.tenant?.firstName || 'Tenant',
        tenantName: `${invoice.tenant?.firstName || ''} ${invoice.tenant?.lastName || ''}`.trim(),
        ownerEmail: invoice.owner?.email,
        ownerFirstName: invoice.owner?.firstName || 'Landlord',
        propertyTitle: invoice.property?.title || 'Property',
        rentAmount: Number(invoice.rentAmount),
        source: 'invoice',
      });
    }

    return { sent };
  }

  private async sendRemindersFor(info: {
    id: string;
    dueDate: string;
    tenantEmail?: string;
    tenantFirstName: string;
    tenantName: string;
    ownerEmail?: string;
    ownerFirstName: string;
    propertyTitle: string;
    rentAmount: number;
    source: string;
  }): Promise<number> {
    const dueDate = new Date(info.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffMs = dueDate.getTime() - today.getTime();
    const daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24));
    let sent = 0;

    try {
      // Upcoming reminders: 7, 3, 1 days before due
      if ([7, 3, 1].includes(daysUntilDue)) {
        if (info.tenantEmail) {
          await this.emailService.sendRentReminder(info.tenantEmail, info.tenantFirstName, info.propertyTitle, info.dueDate, info.rentAmount);
          sent++;
        }
        if (daysUntilDue === 1 && info.ownerEmail) {
          await this.emailService.sendRentReminderToOwner(info.ownerEmail, info.ownerFirstName, info.tenantName, info.propertyTitle, info.dueDate, false);
          sent++;
        }
      }

      // Due today
      if (daysUntilDue === 0) {
        if (info.tenantEmail) {
          await this.emailService.sendRentReminder(info.tenantEmail, info.tenantFirstName, info.propertyTitle, info.dueDate, info.rentAmount);
          sent++;
        }
      }

      // Overdue
      if (daysUntilDue < 0) {
        if (info.tenantEmail) {
          await this.emailService.sendRentOverdue(info.tenantEmail, info.tenantFirstName, info.propertyTitle, info.dueDate, info.rentAmount);
          sent++;
        }
        if (info.ownerEmail) {
          await this.emailService.sendRentReminderToOwner(info.ownerEmail, info.ownerFirstName, info.tenantName, info.propertyTitle, info.dueDate, true);
          sent++;
        }
      }
    } catch (err) {
      console.error(`[RentReminder] Failed to send for ${info.source} ${info.id}:`, err);
    }

    return sent;
  }
}
