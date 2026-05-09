export interface ApiClientOptions {
  baseUrl: string;
}

export function createApiClient(options: ApiClientOptions) {
  return {
    async getCurrentOrganization() {
      const response = await fetch(`${options.baseUrl}/organizations/current`);
      if (!response.ok) throw new Error("organization_load_failed");
      return response.json();
    }
  };
}
