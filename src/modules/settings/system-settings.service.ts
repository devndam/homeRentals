import { AppDataSource } from '../../config/data-source';
import { SystemSettings } from './system-settings.entity';
import { UpdateSystemSettingsDto } from './system-settings.dto';

const settingsRepo = () => AppDataSource.getRepository(SystemSettings);

export class SystemSettingsService {
  async getSettings(): Promise<SystemSettings> {
    let settings = await settingsRepo().findOne({ where: {} });
    if (!settings) {
      // Create singleton row with defaults
      settings = settingsRepo().create();
      settings = await settingsRepo().save(settings);
    }
    return settings;
  }

  async updateSettings(dto: UpdateSystemSettingsDto): Promise<SystemSettings> {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    return settingsRepo().save(settings);
  }

  calculateFees(rentAmount: number, settings: SystemSettings) {
    const calc = (type: string, value: number) => {
      if (!value || value === 0) return 0;
      return type === 'percentage'
        ? Math.round(rentAmount * Number(value) / 100 * 100) / 100
        : Number(value);
    };

    const serviceCharge = calc(settings.serviceChargeType, settings.serviceChargeValue);
    const agentFee = calc(settings.agentFeeType, settings.agentFeeValue);
    const legalFee = calc(settings.legalFeeType, settings.legalFeeValue);
    const cautionDeposit = calc(settings.cautionDepositType, settings.cautionDepositValue);

    return {
      rent: rentAmount,
      serviceCharge,
      agentFee,
      legalFee,
      cautionDeposit,
      totalFees: rentAmount + serviceCharge + agentFee + legalFee + cautionDeposit,
      meta: {
        serviceCharge: { type: settings.serviceChargeType, value: Number(settings.serviceChargeValue) },
        agentFee: { type: settings.agentFeeType, value: Number(settings.agentFeeValue) },
        legalFee: { type: settings.legalFeeType, value: Number(settings.legalFeeValue) },
        cautionDeposit: { type: settings.cautionDepositType, value: Number(settings.cautionDepositValue) },
      },
    };
  }

  calculateRenewalFees(rentAmount: number, settings: SystemSettings) {
    const calc = (type: string, value: number) => {
      if (!value || value === 0) return 0;
      return type === 'percentage'
        ? Math.round(rentAmount * Number(value) / 100 * 100) / 100
        : Number(value);
    };

    const serviceCharge = calc(settings.serviceChargeType, settings.serviceChargeValue);
    const agentFee = calc(settings.agentFeeType, settings.agentFeeValue);
    const legalFee = calc(settings.legalFeeType, settings.legalFeeValue);

    return {
      rent: rentAmount,
      serviceCharge,
      agentFee,
      legalFee,
      cautionDeposit: 0,
      totalFees: rentAmount + serviceCharge + agentFee + legalFee,
      meta: {
        serviceCharge: { type: settings.serviceChargeType, value: Number(settings.serviceChargeValue) },
        agentFee: { type: settings.agentFeeType, value: Number(settings.agentFeeValue) },
        legalFee: { type: settings.legalFeeType, value: Number(settings.legalFeeValue) },
        cautionDeposit: { type: 'fixed', value: 0 },
      },
    };
  }
}
