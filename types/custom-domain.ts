export interface CustomDomainData {
  id: string;
  domain: string;
  verification_token: string;
  is_verified: boolean | null;
  verified_at?: string | null;
  ssl_status: "pending" | "active" | "expired" | "failed" | null;
  created_at: string;
}
