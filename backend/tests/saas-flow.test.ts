import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/server';
import { connectDatabase, disconnectDatabase } from '../src/database/connection';
import { seedInitialData } from '../src/database/seeds';
import {
  Referral,
  RewardTransaction,
  FraudEvent,
  Campaign,
  GiveawayWinner,
} from '../src/database/models';
import { ReferralService } from '../src/modules/referrals/referral.service';

describe('Telegram Referral & Giveaway SaaS Complete Flow', () => {
  let creatorToken: string;
  let workspaceId: string;
  let campaignId: string;
  let inviteLink: string;
  const creatorTelegramId = '88880001';
  const participantTelegramId = '99990002';
  const mockChatId = '-1001987654321';

  beforeAll(async () => {
    await connectDatabase();
    await seedInitialData();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('1. Creator Registration & Workspace Creation', async () => {
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({
        telegramId: creatorTelegramId,
        firstName: 'Alice Founder',
        username: 'alice_founder',
        role: 'user',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.workspaceId).toBeDefined();

    creatorToken = res.body.token;
    workspaceId = res.body.workspaceId;
  });

  it('2. Channel Connection & Verification', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/chats/verify`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .set('x-workspace-id', workspaceId)
      .send({ chatId: mockChatId });

    expect(res.status).toBe(200);
    expect(res.body.verification_status).toBe('verified');
    expect(res.body.chat_id).toBe(mockChatId);
  });

  it('3. Campaign Creation with Multi-channel Requirements and Rewards', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${creatorToken}`)
      .set('x-workspace-id', workspaceId)
      .send({
        title: 'Alpha Community Growth Campaign',
        type: 'hybrid',
        reward_policy: {
          points_per_referral: 25,
          hold_period_hours: 0,
          retention_period_days: 0,
          allow_custom_rewards: true,
        },
        fraud_rules: {
          max_referrals_per_ip_per_hour: 10,
          max_referrals_per_user_per_day: 50,
          auto_hold_suspicious: true,
          suspicious_threshold_score: 60,
        },
        required_chat_ids: [mockChatId],
        rewards: [
          {
            name: 'VIP E-Book Pass',
            type: 'points',
            milestone_referrals_required: 1,
            points_value: 50,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    campaignId = res.body._id;
  });

  it('4. Generate Individual Referral Invite Link', async () => {
    const res = await request(app)
      .post('/api/referrals/link')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        campaignId,
        chatId: mockChatId,
      });

    expect(res.status).toBe(200);
    expect(res.body.invite_link).toBeDefined();
    expect(res.body.referral_code).toBeDefined();
    inviteLink = res.body.invite_link;
  });

  it('5. Process Telegram chat_member Join & Attribution', async () => {
    const chatMemberUpdate = {
      chat: { id: Number(mockChatId), title: 'Alpha Community Chat' },
      from: { id: Number(participantTelegramId), first_name: 'Bob Joiner' },
      new_chat_member: {
        status: 'member',
        user: { id: Number(participantTelegramId), first_name: 'Bob Joiner' },
      },
      old_chat_member: { status: 'left' },
      invite_link: { invite_link: inviteLink },
    };

    await ReferralService.processChatMemberUpdate(chatMemberUpdate);

    // Verify referral record in DB
    const referral = await Referral.findOne({
      campaign_id: campaignId,
      referred_telegram_id: participantTelegramId,
    });

    expect(referral).toBeDefined();
    expect(referral!.referrer_telegram_id).toBe(creatorTelegramId);
    expect(referral!.status).toBe('rewarded'); // verified and rewarded
    expect(referral!.points_awarded).toBe(25);

    // Verify append-only ledger transaction
    const tx = await RewardTransaction.findOne({
      campaign_id: campaignId,
      referral_id: referral!._id,
      type: 'credit',
    });

    expect(tx).toBeDefined();
    expect(tx!.amount).toBe(25);
    expect(tx!.transaction_hash).toBeDefined();
  });

  it('6. Anti-Fraud: Reject Self-Referrals', async () => {
    const selfReferralUpdate = {
      chat: { id: Number(mockChatId), title: 'Alpha Community Chat' },
      from: { id: Number(creatorTelegramId), first_name: 'Alice Founder' },
      new_chat_member: {
        status: 'member',
        user: { id: Number(creatorTelegramId), first_name: 'Alice Founder' },
      },
      old_chat_member: { status: 'left' },
      invite_link: { invite_link: inviteLink },
    };

    await ReferralService.processChatMemberUpdate(selfReferralUpdate);

    const fraudEvent = await FraudEvent.findOne({
      campaign_id: campaignId,
      user_telegram_id: creatorTelegramId,
      event_type: 'self_referral',
    });

    expect(fraudEvent).toBeDefined();
    expect(fraudEvent!.risk_score).toBe(100);
  });

  it('7. Provably-Fair Giveaway Drawing', async () => {
    const res = await request(app)
      .post(`/api/giveaways/${campaignId}/draw`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .set('x-workspace-id', workspaceId)
      .send({
        winner_count: 1,
        method: 'weighted',
        prize_details: '1,000 USDT Grand Prize',
      });

    expect(res.status).toBe(200);
    expect(res.body.winners.length).toBe(1);
    expect(res.body.auditHash).toBeDefined();
    expect(res.body.cryptoSeed).toBeDefined();

    const winner = await GiveawayWinner.findOne({ campaign_id: campaignId });
    expect(winner).toBeDefined();
    expect(winner!.prize_details).toBe('1,000 USDT Grand Prize');
  });

  it('8. Subscription Upgrade with Idempotency', async () => {
    const idempotencyKey = 'test-idemp-key-12345';
    const res = await request(app)
      .post('/api/subscriptions/upgrade')
      .set('Authorization', `Bearer ${creatorToken}`)
      .set('x-workspace-id', workspaceId)
      .set('idempotency-key', idempotencyKey)
      .send({
        plan_code: 'pro',
        billing_cycle: 'monthly',
        provider: 'telegram_stars',
        telegram_charge_id: 'charge_stars_998877',
      });

    expect(res.status).toBe(200);
    expect(res.body.subscription.status).toBe('active');
    expect(res.body.payment.provider).toBe('telegram_stars');
    expect(res.body.invoice.invoice_number).toBeDefined();
  });

  it('9. Real-Time Analytics Overview Verification', async () => {
    const res = await request(app)
      .get(`/api/analytics/overview?campaignId=${campaignId}`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .set('x-workspace-id', workspaceId);

    expect(res.status).toBe(200);
    expect(res.body.metrics.totalReferrals).toBeGreaterThanOrEqual(1);
    expect(res.body.metrics.verifiedReferrals).toBeGreaterThanOrEqual(1);
    expect(res.body.charts.dailyJoins).toBeDefined();
  });
});
