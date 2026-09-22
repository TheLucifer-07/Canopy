import { CanopyApiClient } from '@canopy/api-client';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/v1';

export function createCanopyApi(token = null) {
  return new CanopyApiClient({ baseUrl: API_URL, token });
}
