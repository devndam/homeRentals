import axios from 'axios';
import { env } from '../../config/env';

const PAYSTACK_BASE = 'https://api.paystack.co';

const paystackApi = axios.create({
  baseURL: PAYSTACK_BASE,
  headers: {
    Authorization: `Bearer ${env.paystack.secretKey}`,
    'Content-Type': 'application/json',
  },
});

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel: string;
  paid_at: string;
  metadata: Record<string, any>;
  customer: { email: string };
}

export class PaystackService {
  async initializeTransaction(params: {
    email: string;
    amount: number; // in kobo (NGN * 100)
    reference: string;
    metadata?: Record<string, any>;
    subaccount?: string;
    transaction_charge?: number;
    callback_url?: string;
  }): Promise<PaystackInitResponse> {
    const { data } = await paystackApi.post('/transaction/initialize', {
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      metadata: params.metadata,
      subaccount: params.subaccount,
      transaction_charge: params.transaction_charge,
      callback_url: params.callback_url || `${env.frontendUrl}/payment/verify`,
    });

    return data.data;
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    const { data } = await paystackApi.get(`/transaction/verify/${reference}`);
    return data.data;
  }

  async createSubaccount(params: {
    business_name: string;
    bank_code: string;
    account_number: string;
    percentage_charge: number;
  }): Promise<{ subaccount_code: string }> {
    const { data } = await paystackApi.post('/subaccount', {
      ...params,
      settlement_bank: params.bank_code,
    });
    return data.data;
  }

  async listBanks(): Promise<Array<{ name: string; code: string }>> {
    const { data } = await paystackApi.get('/bank?country=nigeria');
    return data.data;
  }
}
