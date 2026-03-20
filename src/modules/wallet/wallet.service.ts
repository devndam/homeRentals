import { v4 as uuid } from 'uuid';
import { AppDataSource } from '../../config/data-source';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';
import { Property } from '../properties/property.entity';
import { ApiError } from '../../utils/api-error';
import { TransactionType, WithdrawalStatus, PaginatedResponse, PaginationQuery } from '../../types';
import { RequestWithdrawalDto, TransactionFilterDto } from './wallet.dto';
import { paginate } from '../../utils/pagination';

const walletRepo = () => AppDataSource.getRepository(Wallet);
const txnRepo = () => AppDataSource.getRepository(WalletTransaction);
const userRepo = () => AppDataSource.getRepository(User);
const propertyRepo = () => AppDataSource.getRepository(Property);

export class WalletService {
  // ═══════════════════════════════════════════════
  // WALLET CREATION
  // ═══════════════════════════════════════════════

  async createWalletForUser(userId: string, initialBalance?: number): Promise<Wallet> {
    const existing = await walletRepo().findOne({ where: { userId } });
    if (existing) {
      if (initialBalance && initialBalance > 0) {
        existing.balance = Number(existing.balance) + initialBalance;
        existing.totalEarned = Number(existing.totalEarned) + initialBalance;
        return walletRepo().save(existing);
      }
      return existing;
    }

    const wallet = walletRepo().create({
      userId,
      balance: initialBalance || 0,
      totalEarned: initialBalance || 0,
    });
    return walletRepo().save(wallet);
  }

  // ═══════════════════════════════════════════════
  // OWNER-FACING
  // ═══════════════════════════════════════════════

  async getMyWallet(userId: string): Promise<Wallet> {
    const wallet = await walletRepo().findOne({ where: { userId } });
    if (!wallet) throw ApiError.notFound('Wallet not found');
    return wallet;
  }

  async getMyTransactions(
    userId: string,
    filters: TransactionFilterDto,
  ): Promise<PaginatedResponse<WalletTransaction>> {
    const wallet = await this.getMyWallet(userId);

    const qb = txnRepo()
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.relatedPayment', 'payment')
      .where('t.walletId = :walletId', { walletId: wallet.id });

    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }
    if (filters.fromDate) {
      qb.andWhere('t.createdAt >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      qb.andWhere('t.createdAt <= :toDate', { toDate: filters.toDate });
    }

    return paginate(qb, {
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort || 'createdAt',
      order: filters.order || 'DESC',
    });
  }

  async requestWithdrawal(userId: string, dto: RequestWithdrawalDto): Promise<WalletTransaction> {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    if (!user.bankName || !user.bankAccountNumber || !user.bankAccountName) {
      throw ApiError.badRequest('Please add your bank details before requesting a withdrawal');
    }

    const wallet = await this.getMyWallet(userId);

    if (dto.amount > Number(wallet.balance)) {
      throw ApiError.badRequest('Insufficient wallet balance');
    }

    // Check for existing pending withdrawal
    const pendingWithdrawal = await txnRepo().findOne({
      where: {
        walletId: wallet.id,
        type: TransactionType.DEBIT,
        status: WithdrawalStatus.PENDING,
      },
    });
    if (pendingWithdrawal) {
      throw ApiError.conflict('You already have a pending withdrawal request');
    }

    return AppDataSource.transaction(async (manager) => {
      const walletInTx = await manager.findOne(Wallet, {
        where: { id: wallet.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!walletInTx) throw ApiError.notFound('Wallet not found');

      if (dto.amount > Number(walletInTx.balance)) {
        throw ApiError.badRequest('Insufficient wallet balance');
      }

      const newBalance = Number(walletInTx.balance) - dto.amount;
      walletInTx.balance = newBalance;
      await manager.save(Wallet, walletInTx);

      const reference = `WTX-${uuid().split('-')[0].toUpperCase()}-${Date.now()}`;

      const txn = manager.create(WalletTransaction, {
        walletId: wallet.id,
        type: TransactionType.DEBIT,
        amount: dto.amount,
        reference,
        description: dto.description || 'Withdrawal request',
        balanceAfter: newBalance,
        status: WithdrawalStatus.PENDING,
      });

      return manager.save(WalletTransaction, txn);
    });
  }

  // ═══════════════════════════════════════════════
  // CREDIT WALLET (called from payment service)
  // ═══════════════════════════════════════════════

  async creditOwnerWallet(payment: Payment): Promise<void> {
    if (!payment.propertyId || Number(payment.ownerAmount) <= 0) return;

    const property = await propertyRepo().findOne({
      where: { id: payment.propertyId },
      select: ['id', 'ownerId'],
    });
    if (!property) return;

    const ownerId = property.ownerId;

    // Ensure wallet exists
    let wallet = await walletRepo().findOne({ where: { userId: ownerId } });
    if (!wallet) {
      wallet = await this.createWalletForUser(ownerId);
    }

    await AppDataSource.transaction(async (manager) => {
      const walletInTx = await manager.findOne(Wallet, {
        where: { id: wallet!.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!walletInTx) return;

      const creditAmount = Number(payment.ownerAmount);
      const newBalance = Number(walletInTx.balance) + creditAmount;

      walletInTx.balance = newBalance;
      walletInTx.totalEarned = Number(walletInTx.totalEarned) + creditAmount;
      await manager.save(Wallet, walletInTx);

      const reference = `WTX-${uuid().split('-')[0].toUpperCase()}-${Date.now()}`;

      const txn = manager.create(WalletTransaction, {
        walletId: walletInTx.id,
        type: TransactionType.CREDIT,
        amount: creditAmount,
        reference,
        description: `Earning from payment ${payment.reference}`,
        relatedPaymentId: payment.id,
        balanceAfter: newBalance,
        status: WithdrawalStatus.COMPLETED,
      });

      await manager.save(WalletTransaction, txn);
    });
  }

  // ═══════════════════════════════════════════════
  // ADMIN-FACING
  // ═══════════════════════════════════════════════

  async getAllWallets(query: PaginationQuery & { search?: string }): Promise<PaginatedResponse<Wallet>> {
    const qb = walletRepo()
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.user', 'user');

    if (query.search) {
      qb.andWhere(
        '(user.firstName ILIKE :s OR user.lastName ILIKE :s OR user.email ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    return paginate(qb, {
      ...query,
      sort: query.sort || 'w.createdAt',
      order: query.order || 'DESC',
    });
  }

  async getWalletTransactions(
    walletId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<WalletTransaction>> {
    const wallet = await walletRepo().findOne({ where: { id: walletId } });
    if (!wallet) throw ApiError.notFound('Wallet not found');

    const qb = txnRepo()
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.relatedPayment', 'payment')
      .where('t.walletId = :walletId', { walletId });

    return paginate(qb, {
      ...query,
      sort: query.sort || 'createdAt',
      order: query.order || 'DESC',
    });
  }

  async getAllWithdrawals(
    query: PaginationQuery & { status?: WithdrawalStatus },
  ): Promise<PaginatedResponse<WalletTransaction>> {
    const qb = txnRepo()
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.wallet', 'wallet')
      .leftJoinAndSelect('wallet.user', 'user')
      .where('t.type = :type', { type: TransactionType.DEBIT });

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }

    return paginate(qb, {
      ...query,
      sort: query.sort || 'createdAt',
      order: query.order || 'DESC',
    });
  }

  async approveWithdrawal(transactionId: string, adminId: string): Promise<WalletTransaction> {
    const txn = await txnRepo().findOne({
      where: { id: transactionId },
      relations: ['wallet'],
    });
    if (!txn) throw ApiError.notFound('Withdrawal not found');

    if (txn.type !== TransactionType.DEBIT) {
      throw ApiError.badRequest('This is not a withdrawal transaction');
    }
    if (txn.status !== WithdrawalStatus.PENDING) {
      throw ApiError.badRequest('This withdrawal has already been processed');
    }

    txn.status = WithdrawalStatus.APPROVED;
    txn.processedByAdminId = adminId;
    txn.processedAt = new Date();
    await txnRepo().save(txn);

    // Update wallet totalWithdrawn
    await AppDataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: txn.walletId },
        lock: { mode: 'pessimistic_write' },
      });
      if (wallet) {
        wallet.totalWithdrawn = Number(wallet.totalWithdrawn) + Number(txn.amount);
        await manager.save(Wallet, wallet);
      }
    });

    return txn;
  }

  async rejectWithdrawal(transactionId: string, adminId: string, reason: string): Promise<WalletTransaction> {
    const txn = await txnRepo().findOne({
      where: { id: transactionId },
      relations: ['wallet'],
    });
    if (!txn) throw ApiError.notFound('Withdrawal not found');

    if (txn.type !== TransactionType.DEBIT) {
      throw ApiError.badRequest('This is not a withdrawal transaction');
    }
    if (txn.status !== WithdrawalStatus.PENDING) {
      throw ApiError.badRequest('This withdrawal has already been processed');
    }

    // Refund held amount back to wallet
    await AppDataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: txn.walletId },
        lock: { mode: 'pessimistic_write' },
      });
      if (wallet) {
        wallet.balance = Number(wallet.balance) + Number(txn.amount);
        await manager.save(Wallet, wallet);
        txn.balanceAfter = Number(wallet.balance);
      }
    });

    txn.status = WithdrawalStatus.REJECTED;
    txn.rejectionReason = reason;
    txn.processedByAdminId = adminId;
    txn.processedAt = new Date();
    await txnRepo().save(txn);

    return txn;
  }
}
