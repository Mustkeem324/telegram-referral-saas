const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (workspaceId) {
    headers['x-workspace-id'] = workspaceId;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  // Real Telegram Auth
  createBotAuthSession: () => apiRequest('/auth/bot-session', { method: 'POST' }),
  checkBotAuthSession: (sessionId: string) => apiRequest(`/auth/bot-session/${sessionId}`),
  telegramWidgetLogin: (data: any) =>
    apiRequest('/auth/telegram-widget', { method: 'POST', body: JSON.stringify(data) }),
  telegramWebAppLogin: (initData: string) =>
    apiRequest('/auth/telegram-webapp', { method: 'POST', body: JSON.stringify({ initData }) }),
  getMe: () => apiRequest('/auth/me'),

  // Workspaces
  getWorkspaces: () => apiRequest('/workspaces'),
  createWorkspace: (name: string) => apiRequest('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
  getWorkspaceChats: (workspaceId: string) => apiRequest(`/workspaces/${workspaceId}/chats`),
  verifyChat: (workspaceId: string, chatId: string) =>
    apiRequest(`/workspaces/${workspaceId}/chats/verify`, { method: 'POST', body: JSON.stringify({ chatId }) }),
  connectCustomBot: (workspaceId: string, token: string) =>
    apiRequest(`/workspaces/${workspaceId}/custom-bot`, { method: 'POST', body: JSON.stringify({ token }) }),

  // Campaigns
  getCampaigns: () => apiRequest('/campaigns'),
  getCampaign: (id: string) => apiRequest(`/campaigns/${id}`),
  createCampaign: (data: any) => apiRequest('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaignStatus: (id: string, status: string) =>
    apiRequest(`/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Referrals
  getReferralLink: (campaignId: string, chatId?: string) =>
    apiRequest('/referrals/link', { method: 'POST', body: JSON.stringify({ campaignId, chatId }) }),
  getCampaignReferrals: (campaignId: string, page = 1, status = 'all') =>
    apiRequest(`/referrals/campaign/${campaignId}?page=${page}&status=${status}`),
  getLeaderboard: (campaignId: string) => apiRequest(`/referrals/leaderboard/${campaignId}`),

  // Rewards
  getCampaignRewards: (campaignId: string) => apiRequest(`/rewards/campaign/${campaignId}`),
  createReward: (data: any) => apiRequest('/rewards', { method: 'POST', body: JSON.stringify(data) }),
  uploadInventory: (rewardId: string, codes: string[]) =>
    apiRequest(`/rewards/${rewardId}/inventory`, { method: 'POST', body: JSON.stringify({ codes }) }),
  getRewardLedger: (campaignId: string, page = 1) =>
    apiRequest(`/rewards/ledger/${campaignId}?page=${page}`),

  // Giveaways
  drawGiveawayWinners: (campaignId: string, data: any) =>
    apiRequest(`/giveaways/${campaignId}/draw`, { method: 'POST', body: JSON.stringify(data) }),
  replaceWinner: (winner_id: string, reason: string) =>
    apiRequest('/giveaways/replace-winner', { method: 'POST', body: JSON.stringify({ winner_id, reason }) }),
  getGiveawayWinners: (campaignId: string) => apiRequest(`/giveaways/${campaignId}/winners`),
  getGiveawayEntries: (campaignId: string, page = 1) =>
    apiRequest(`/giveaways/${campaignId}/entries?page=${page}`),
  getPublicGiveaway: (campaignId: string) => apiRequest(`/giveaways/public/${campaignId}`),

  // AntiFraud
  getFraudEvents: (page = 1, resolved?: boolean) => {
    const query = resolved !== undefined ? `&resolved=${resolved}` : '';
    return apiRequest(`/antifraud?page=${page}${query}`);
  },
  resolveFraudEvent: (eventId: string, action: string) =>
    apiRequest(`/antifraud/${eventId}/resolve`, { method: 'POST', body: JSON.stringify({ action }) }),

  // Subscriptions & Billing
  getPlans: () => apiRequest('/subscriptions/plans'),
  getCurrentSubscription: () => apiRequest('/subscriptions/current'),
  upgradeSubscription: (data: any) =>
    apiRequest('/subscriptions/upgrade', { method: 'POST', body: JSON.stringify(data) }),
  getInvoices: () => apiRequest('/subscriptions/invoices'),

  // Analytics
  getAnalyticsOverview: (campaignId?: string) => {
    const query = campaignId ? `?campaignId=${campaignId}` : '';
    return apiRequest(`/analytics/overview${query}`);
  },
  exportCsvUrl: (campaignId?: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const ws = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : '';
    return `${API_BASE}/analytics/export/csv?${campaignId ? `campaignId=${campaignId}&` : ''}token=${token}`;
  },

  // Super Admin
  getAdminOverview: () => apiRequest('/admin/overview'),
  getAdminUsers: (page = 1, search = '') => apiRequest(`/admin/users?page=${page}&search=${search}`),
  setAdminUserStatus: (userId: string, is_active: boolean, ban_reason?: string) =>
    apiRequest(`/admin/users/${userId}/status`, { method: 'POST', body: JSON.stringify({ is_active, ban_reason }) }),
  getAdminHealth: () => apiRequest('/admin/health'),
  getAdminTickets: () => apiRequest('/admin/tickets'),
  replyAdminTicket: (ticketId: string, message: string, status?: string) =>
    apiRequest(`/admin/tickets/${ticketId}/reply`, { method: 'POST', body: JSON.stringify({ message, status }) }),
};
