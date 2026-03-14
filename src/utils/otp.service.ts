import crypto from 'crypto';

export class OtpService {
  /**
   * Generates a 6-digit OTP and its SHA-256 hash.
   */
  static generate(): { otp: string; hashedOTP: string } {
    // const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp = "123456"; // For testing purposes, use a fixed OTP. Replace with above line in production.
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    return { otp, hashedOTP };
  }

  /**
   * Hashes a plain OTP using SHA-256.
   */
  static hash(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }
}
