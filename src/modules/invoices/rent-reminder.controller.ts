import { Request, Response } from 'express';
import { RentReminderService } from './rent-reminder.service';

const reminderService = new RentReminderService();

export class RentReminderController {
  async processReminders(_req: Request, res: Response) {
    const result = await reminderService.processReminders();
    res.json({
      status: 'success',
      message: `Processed rent reminders. ${result.sent} email(s) sent.`,
      data: result,
    });
  }
}
