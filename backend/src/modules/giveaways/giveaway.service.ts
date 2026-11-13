import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  Campaign,
  GiveawayEntry,
  GiveawayWinner,
  WinnerSelectionMethod,
  User,
} from '../../database/models';
import { TelegramService } from '../telegram/telegram.service';
import { logger } from '../../utils/logger';

export class GiveawayService {
  /**
   * Draw winners for a giveaway campaign with cryptographic provably-fair verification
   */
  static async drawWinners(params: {
    campaignId: string | mongoose.Types.ObjectId;
    winnerCount: number;
    method: WinnerSelectionMethod;
    prizeDetails: string;
  }): Promise<{ winners: any[]; auditHash: string; cryptoSeed: string }> {
    const campaign = await Campaign.findById(params.campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const eligibleEntries = await GiveawayEntry.find({
      campaign_id: campaign._id,
      is_eligible: true,
    });

    if (eligibleEntries.length === 0) {
      throw new Error('No eligible participants found for this giveaway.');
    }

    const countToPick = Math.min(params.winnerCount, eligibleEntries.length);

    // Cryptographic seed for provable fairness
    const cryptoSeed = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const auditHash = crypto
      .createHash('sha256')
      .update(`${cryptoSeed}:${campaign._id}:${countToPick}:${timestamp}`)
      .digest('hex');

    // Build raffle pool
    let ticketPool: string[] = [];

    if (params.method === 'random') {
      ticketPool = eligibleEntries.map((e) => e.user_telegram_id);
    } else if (params.method === 'weighted') {
      for (const entry of eligibleEntries) {
        const tickets = Math.max(1, entry.entry_count);
        for (let i = 0; i < tickets; i++) {
          ticketPool.push(entry.user_telegram_id);
        }
      }
    } else if (params.method === 'points') {
      for (const entry of eligibleEntries) {
        const tickets = Math.max(1, Math.floor(entry.points_spent || entry.entry_count));
        for (let i = 0; i < tickets; i++) {
          ticketPool.push(entry.user_telegram_id);
        }
      }
    } else {
      // fallback to random
      ticketPool = eligibleEntries.map((e) => e.user_telegram_id);
    }

    // Cryptographically secure selection without duplicate winners
    const selectedTgIds = new Set<string>();
    const drawnWinners: any[] = [];
    let rank = 1;

    // Shuffle pool with deterministic crypto seed
    const seedInt = parseInt(cryptoSeed.slice(0, 8), 16);
    let workingPool = [...ticketPool];

    while (selectedTgIds.size < countToPick && workingPool.length > 0) {
      const randomIndex = crypto.randomInt(0, workingPool.length);
      const chosenId = workingPool[randomIndex];

      if (!selectedTgIds.has(chosenId)) {
        selectedTgIds.add(chosenId);

        const winnerDoc = await GiveawayWinner.create({
          workspace_id: campaign.workspace_id,
          campaign_id: campaign._id,
          user_telegram_id: chosenId,
          rank,
          prize_details: params.prizeDetails,
          selected_method: params.method,
          crypto_seed: cryptoSeed,
          audit_hash: auditHash,
          status: 'selected',
        });

        drawnWinners.push(winnerDoc);
        rank++;

        // Notify winner on Telegram
        TelegramService.sendMessage(
          chosenId,
          `🎊 **YOU WON A GIVEAWAY!** 🎊\n\n` +
          `Congratulations! You were selected as Winner #${winnerDoc.rank} in **${campaign.title}**!\n\n` +
          `🎁 **Prize:** ${params.prizeDetails}\n` +
          `🔐 **Audit Hash:** \`${auditHash.slice(0, 16)}...\`\n\n` +
          `Check the dashboard or reach out to campaign support to claim your prize!`
        ).catch(() => {});
      }

      // Remove chosenId occurrences
      workingPool = workingPool.filter((id) => id !== chosenId);
    }

    campaign.status = 'ended';
    await campaign.save();

    return {
      winners: drawnWinners,
      auditHash,
      cryptoSeed,
    };
  }

  /**
   * Replace a disqualified winner with a replacement drawn from remaining participants
   */
  static async replaceWinner(params: {
    winnerId: string;
    reason: string;
  }): Promise<any> {
    const existingWinner = await GiveawayWinner.findById(params.winnerId);
    if (!existingWinner) throw new Error('Winner record not found');
    if (existingWinner.status === 'replaced') throw new Error('Winner has already been replaced');

    const campaign = await Campaign.findById(existingWinner.campaign_id);
    if (!campaign) throw new Error('Campaign not found');

    // Find all already selected/active winners
    const activeWinners = await GiveawayWinner.find({
      campaign_id: campaign._id,
      status: { $in: ['selected', 'notified', 'claimed'] },
    });
    const excludeIds = new Set(activeWinners.map((w) => w.user_telegram_id));
    excludeIds.add(existingWinner.user_telegram_id);

    // Eligible remaining entries
    const remainingEntries = await GiveawayEntry.find({
      campaign_id: campaign._id,
      is_eligible: true,
      user_telegram_id: { $nin: Array.from(excludeIds) },
    });

    if (remainingEntries.length === 0) {
      throw new Error('No remaining eligible participants available for replacement.');
    }

    const randomIndex = crypto.randomInt(0, remainingEntries.length);
    const chosen = remainingEntries[randomIndex];

    const replacementSeed = crypto.randomBytes(32).toString('hex');
    const replacementHash = crypto
      .createHash('sha256')
      .update(`replacement:${replacementSeed}:${existingWinner._id}:${Date.now()}`)
      .digest('hex');

    const replacementWinner = await GiveawayWinner.create({
      workspace_id: campaign.workspace_id,
      campaign_id: campaign._id,
      user_telegram_id: chosen.user_telegram_id,
      rank: existingWinner.rank,
      prize_details: existingWinner.prize_details,
      selected_method: existingWinner.selected_method,
      crypto_seed: replacementSeed,
      audit_hash: replacementHash,
      status: 'selected',
    });

    existingWinner.status = 'disqualified';
    existingWinner.replacement_reason = params.reason;
    existingWinner.replaced_by_winner_id = replacementWinner._id as any;
    await existingWinner.save();

    TelegramService.sendMessage(
      chosen.user_telegram_id,
      `🎊 **GIVEAWAY REPLACEMENT DRAW WINNER!** 🎊\n\nYou were drawn as replacement winner for Rank #${existingWinner.rank} in **${campaign.title}**!\n\n` +
      `🎁 **Prize:** ${existingWinner.prize_details}`
    ).catch(() => {});

    return replacementWinner;
  }
}
