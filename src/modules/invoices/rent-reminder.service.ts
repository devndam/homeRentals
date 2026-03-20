import { AppDataSource } from '../../config/data-source';
import { Invoice } from './invoice.entity';
import { InvoiceStatus } from '../../types';
import { EmailService } from '../../utils/email.service';

const invoiceRepo = () => AppDataSource.getRepository(Invoice);

export class RentReminderService {
  private emailService = new EmailService();

  async processReminders(): Promise<{ sent: number }> {
    const invoices = await invoiceRepo().find({
      where: {
        status: InvoiceStatus.COMPLETED,
        initialPaymentDone: true,
      },
      relations: ['tenant', 'owner', 'property'],
    });

    let sent = 0;

    for (const invoice of invoices) {
      if (!invoice.nextRentDueDate) continue;

      const dueDate = new Date(invoice.nextRentDueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      const diffMs = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const tenantEmail = invoice.tenant?.email;
      const tenantName = `${invoice.tenant?.firstName || ''} ${invoice.tenant?.lastName || ''}`.trim();
      const ownerEmail = invoice.owner?.email;
      const ownerFirstName = invoice.owner?.firstName || 'Landlord';
      const tenantFirstName = invoice.tenant?.firstName || 'Tenant';
      const propertyTitle = invoice.property?.title || 'Property';
      const rentAmount = Number(invoice.rentAmount);
      const dueDateStr = invoice.nextRentDueDate;

      try {
        // Upcoming reminders: 7, 3, 1 days before due
        if ([7, 3, 1].includes(daysUntilDue)) {
          if (tenantEmail) {
            await this.emailService.sendRentReminder(tenantEmail, tenantFirstName, propertyTitle, dueDateStr, rentAmount);
            sent++;
          }
          // Notify owner 1 day before
          if (daysUntilDue === 1 && ownerEmail) {
            await this.emailService.sendRentReminderToOwner(ownerEmail, ownerFirstName, tenantName, propertyTitle, dueDateStr, false);
            sent++;
          }
        }

        // Due today
        if (daysUntilDue === 0) {
          if (tenantEmail) {
            await this.emailService.sendRentReminder(tenantEmail, tenantFirstName, propertyTitle, dueDateStr, rentAmount);
            sent++;
          }
        }

        // Overdue (daily after due date)
        if (daysUntilDue < 0) {
          if (tenantEmail) {
            await this.emailService.sendRentOverdue(tenantEmail, tenantFirstName, propertyTitle, dueDateStr, rentAmount);
            sent++;
          }
          if (ownerEmail) {
            await this.emailService.sendRentReminderToOwner(ownerEmail, ownerFirstName, tenantName, propertyTitle, dueDateStr, true);
            sent++;
          }
        }
      } catch (err) {
        console.error(`[RentReminder] Failed to send for invoice ${invoice.id}:`, err);
      }
    }

    return { sent };
  }
}
