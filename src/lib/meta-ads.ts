const META_API_BASE = "https://graph.facebook.com/v21.0";

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

interface MetaInsight {
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  actions?: Array<{ action_type: string; value: string }>;
}

interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

export class MetaAdsClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${META_API_BASE}${endpoint}${separator}access_token=${this.accessToken}`;

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
      const apiError = data as MetaApiError;
      throw new Error(
        apiError.error?.message || `Meta API error: ${res.status}`
      );
    }

    return data as T;
  }

  async getAdAccounts(): Promise<MetaAdAccount[]> {
    const data = await this.request<{ data: MetaAdAccount[] }>(
      "/me/adaccounts?fields=id,name,account_status"
    );
    return data.data;
  }

  async getCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
    const accountId = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    const data = await this.request<{ data: MetaCampaign[] }>(
      `/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=500`
    );
    return data.data;
  }

  async getCampaignInsights(
    campaignId: string,
    dateRange?: { since: string; until: string }
  ): Promise<MetaInsight | null> {
    let endpoint = `/${campaignId}/insights?fields=spend,impressions,clicks,ctr,cpc,cost_per_action_type,actions`;

    if (dateRange) {
      endpoint += `&time_range={"since":"${dateRange.since}","until":"${dateRange.until}"}`;
    } else {
      endpoint += "&date_preset=last_30d";
    }

    const data = await this.request<{ data: MetaInsight[] }>(endpoint);
    return data.data?.[0] || null;
  }

  async updateCampaignStatus(
    campaignId: string,
    status: "ACTIVE" | "PAUSED"
  ): Promise<void> {
    await this.request(`/${campaignId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async updateCampaignBudget(
    campaignId: string,
    dailyBudget?: number,
    lifetimeBudget?: number
  ): Promise<void> {
    const body: Record<string, number> = {};

    if (dailyBudget !== undefined) {
      body.daily_budget = Math.round(dailyBudget * 100);
    }

    if (lifetimeBudget !== undefined) {
      body.lifetime_budget = Math.round(lifetimeBudget * 100);
    }

    await this.request(`/${campaignId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
}
