const GOOGLE_ADS_BASE = "https://googleads.googleapis.com/v18";

interface GoogleAdsSearchResponse {
  results?: GoogleAdsCampaignRow[];
  fieldMask?: string;
}

interface GoogleAdsCampaignRow {
  campaign: {
    resourceName: string;
    id: string;
    name: string;
    status: string;
    campaignBudget: string;
  };
  metrics: {
    costMicros: string;
    impressions: string;
    clicks: string;
    ctr: number;
    averageCpc: number;
    conversions: number;
  };
}

interface GoogleAdsMutateResponse {
  results: Array<{ resourceName: string }>;
}

export class GoogleAdsClient {
  private accessToken: string;
  private developerToken: string;
  private customerId: string;

  constructor(accessToken: string, developerToken: string, customerId: string) {
    this.accessToken = accessToken;
    this.developerToken = developerToken;
    this.customerId = customerId.replace(/-/g, "");
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "developer-token": this.developerToken,
      "login-customer-id": this.customerId,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${GOOGLE_ADS_BASE}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options?.headers,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      const message =
        data?.error?.message ||
        data?.error?.details?.[0]?.errors?.[0]?.message ||
        `Google Ads API error: ${res.status}`;
      throw new Error(message);
    }

    return data as T;
  }

  async listCampaigns(): Promise<GoogleAdsCampaignRow[]> {
    const query = `SELECT campaign.id, campaign.name, campaign.status, campaign.campaign_budget, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC`;

    const data = await this.request<GoogleAdsSearchResponse>(
      `/customers/${this.customerId}/googleAds:search`,
      {
        method: "POST",
        body: JSON.stringify({ query }),
      }
    );

    return data.results || [];
  }

  async updateCampaignStatus(
    campaignId: string,
    status: "ENABLED" | "PAUSED"
  ): Promise<GoogleAdsMutateResponse> {
    return this.request<GoogleAdsMutateResponse>(
      `/customers/${this.customerId}/campaigns:mutate`,
      {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              update: {
                resourceName: `customers/${this.customerId}/campaigns/${campaignId}`,
                status,
              },
              updateMask: "status",
            },
          ],
        }),
      }
    );
  }

  async updateCampaignBudget(
    budgetId: string,
    amountMicros: number
  ): Promise<GoogleAdsMutateResponse> {
    return this.request<GoogleAdsMutateResponse>(
      `/customers/${this.customerId}/campaignBudgets:mutate`,
      {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              update: {
                resourceName: budgetId,
                amountMicros: amountMicros.toString(),
              },
              updateMask: "amount_micros",
            },
          ],
        }),
      }
    );
  }
}
