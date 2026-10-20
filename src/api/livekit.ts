import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";
import type { LiveKitTokenRequest, LiveKitTokenResponse } from "@/types/voice";

export async function getLiveKitToken(
  tenantId: string,
  apiKey: string,
  payload: LiveKitTokenRequest,
): Promise<LiveKitTokenResponse> {
  const { data } = await axios.post<LiveKitTokenResponse>(
    `${API_BASE_URL}/api/v1/livekit/token`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantId,
        "X-API-Key": apiKey,
      },
    },
  );
  return data;
}
