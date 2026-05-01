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

  async uploadImage(
    adAccountId: string,
    imageUrl: string
  ): Promise<{ hash: string }> {
    const accountId = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    const data = await this.request<{ images: Record<string, { hash: string }> }>(
      `/${accountId}/adimages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl }),
      }
    );

    const keys = Object.keys(data.images);
    return { hash: data.images[keys[0]].hash };
  }

  async createCreative(
    adAccountId: string,
    creative: {
      imageHash: string;
      title: string;
      body: string;
      linkUrl: string;
      callToAction?: string;
    }
  ): Promise<{ id: string }> {
    const accountId = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    const data = await this.request<{ id: string }>(
      `/${accountId}/adcreatives`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: creative.title,
          object_story_spec: {
            link_data: {
              image_hash: creative.imageHash,
              link: creative.linkUrl,
              message: creative.body,
              name: creative.title,
              call_to_action: {
                type: creative.callToAction || "LEARN_MORE",
              },
            },
          },
        }),
      }
    );

    return { id: data.id };
  }

  async createAd(
    adSetId: string,
    creativeId: string,
    name: string,
    status: "ACTIVE" | "PAUSED" = "PAUSED"
  ): Promise<{ id: string }> {
    const data = await this.request<{ id: string }>(
      `/${adSetId}/ads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          adset_id: adSetId,
          creative: { creative_id: creativeId },
          status,
        }),
      }
    );

    return { id: data.id };
  }

  async getAds(
    adSetId: string
  ): Promise<Array<{ id: string; name: string; status: string; creative?: { id: string } }>> {
    const data = await this.request<{
      data: Array<{ id: string; name: string; status: string; creative?: { id: string } }>;
    }>(`/${adSetId}/ads?fields=id,name,status,creative`);

    return data.data;
  }

  async updateAdStatus(
    adId: string,
    status: "ACTIVE" | "PAUSED" | "DELETED"
  ): Promise<void> {
    await this.request(`/${adId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }
}
