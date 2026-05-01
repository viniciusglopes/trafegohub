const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

interface TikTokApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface TikTokAdvertiser {
  advertiser_id: string;
  advertiser_name: string;
}

interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  operation_status: string;
  budget: number;
  budget_mode: string;
  objective_type: string;
}

interface TikTokReportRow {
  dimensions: { campaign_id: string };
  metrics: {
    spend: string;
    impressions: string;
    clicks: string;
    ctr: string;
    cpc: string;
    conversion: string;
    cost_per_conversion: string;
  };
}

export class TikTokAdsClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${TIKTOK_API_BASE}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        "Access-Token": this.accessToken,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const json = (await res.json()) as TikTokApiResponse<T>;

    if (json.code !== 0) {
      throw new Error(json.message || `TikTok API error: ${json.code}`);
    }

    return json.data;
  }

  async getAdvertiserIds(): Promise<TikTokAdvertiser[]> {
    const data = await this.request<{ list: TikTokAdvertiser[] }>(
      "/oauth2/advertiser/get"
    );
    return data.list || [];
  }

  async getCampaigns(advertiserId: string): Promise<TikTokCampaign[]> {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      fields: JSON.stringify([
        "campaign_id",
        "campaign_name",
        "operation_status",
        "budget",
        "budget_mode",
        "objective_type",
      ]),
    });

    const data = await this.request<{ list: TikTokCampaign[] }>(
      `/campaign/get?${params.toString()}`
    );
    return data.list || [];
  }

  async getCampaignMetrics(
    advertiserId: string,
    campaignIds: string[]
  ): Promise<Map<string, TikTokReportRow["metrics"]>> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const format = (d: Date) => d.toISOString().split("T")[0];

    const data = await this.request<{ list: TikTokReportRow[] }>(
      "/report/integrated/get",
      {
        method: "POST",
        body: JSON.stringify({
          advertiser_id: advertiserId,
          report_type: "BASIC",
          dimensions: ["campaign_id"],
          metrics: [
            "spend",
            "impressions",
            "clicks",
            "ctr",
            "cpc",
            "conversion",
            "cost_per_conversion",
          ],
          data_level: "AUCTION_CAMPAIGN",
          start_date: format(thirtyDaysAgo),
          end_date: format(now),
          filtering: [
            {
              field_name: "campaign_ids",
              filter_type: "IN",
              filter_value: JSON.stringify(campaignIds),
            },
          ],
        }),
      }
    );

    const map = new Map<string, TikTokReportRow["metrics"]>();
    for (const row of data.list || []) {
      map.set(row.dimensions.campaign_id, row.metrics);
    }
    return map;
  }

  async updateCampaignStatus(
    advertiserId: string,
    campaignId: string,
    status: "ENABLE" | "DISABLE"
  ): Promise<void> {
    await this.request("/campaign/status/update", {
      method: "POST",
      body: JSON.stringify({
        advertiser_id: advertiserId,
        campaign_ids: [campaignId],
        opt_status: status,
      }),
    });
  }

  async updateCampaignBudget(
    advertiserId: string,
    campaignId: string,
    budget: number
  ): Promise<void> {
    await this.request("/campaign/update", {
      method: "POST",
      body: JSON.stringify({
        advertiser_id: advertiserId,
        campaign_id: campaignId,
        budget,
      }),
    });
  }

  async uploadImage(
    advertiserId: string,
    imageUrl: string
  ): Promise<{ imageId: string }> {
    const data = await this.request<{ image_id: string }>(
      "/file/image/ad/upload/",
      {
        method: "POST",
        body: JSON.stringify({
          advertiser_id: advertiserId,
          image_url: imageUrl,
          upload_type: "UPLOAD_BY_URL",
        }),
      }
    );

    return { imageId: data.image_id };
  }

  async createAd(
    advertiserId: string,
    adgroupId: string,
    adData: {
      adName: string;
      imageId?: string;
      title?: string;
      description?: string;
      landingPageUrl?: string;
      callToAction?: string;
    }
  ): Promise<{ adId: string }> {
    const data = await this.request<{ ad_id: string }>(
      "/ad/create/",
      {
        method: "POST",
        body: JSON.stringify({
          advertiser_id: advertiserId,
          adgroup_id: adgroupId,
          creatives: [
            {
              ad_name: adData.adName,
              image_ids: adData.imageId ? [adData.imageId] : [],
              ad_text: adData.description || "",
              title: adData.title || "",
              landing_page_url: adData.landingPageUrl || "",
              call_to_action: adData.callToAction || "LEARN_MORE",
            },
          ],
        }),
      }
    );

    return { adId: data.ad_id };
  }

  async getAds(
    advertiserId: string,
    adgroupId: string
  ): Promise<
    Array<{
      ad_id: string;
      ad_name: string;
      operation_status: string;
    }>
  > {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ adgroup_ids: [adgroupId] }),
      fields: JSON.stringify([
        "ad_id",
        "ad_name",
        "operation_status",
      ]),
    });

    const data = await this.request<{
      list: Array<{
        ad_id: string;
        ad_name: string;
        operation_status: string;
      }>;
    }>(`/ad/get/?${params.toString()}`);

    return data.list || [];
  }

  async updateAdStatus(
    advertiserId: string,
    adIds: string[],
    status: "ENABLE" | "DISABLE" | "DELETE"
  ): Promise<void> {
    await this.request("/ad/status/update/", {
      method: "POST",
      body: JSON.stringify({
        advertiser_id: advertiserId,
        ad_ids: adIds,
        opt_status: status,
      }),
    });
  }
}
