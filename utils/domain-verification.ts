import { randomBytes } from "crypto";
import dns from "dns/promises";

import { appHostname, deploymentRootDomain } from "./runtime-config";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);

export interface DomainVerificationResult {
  verified: boolean;
  method: "dns" | "file";
  error?: string;
  records?: string[];
}

export function generateVerificationToken(): string {
  return `coderocket-verify-${randomBytes(16).toString("hex")}`;
}

export async function verifyDomainDNS(
  domain: string,
  expectedToken: string,
): Promise<DomainVerificationResult> {
  try {
    const verifyDomain = `_coderocket-verify.${domain}`;
    const txtRecords = await dns.resolveTxt(verifyDomain);
    const flatRecords = txtRecords.flat();
    const verified = flatRecords.some((record) => record === expectedToken);

    return {
      verified,
      method: "dns",
      records: flatRecords,
    };
  } catch (error) {
    return {
      verified: false,
      method: "dns",
      error:
        error instanceof Error
          ? error.message
          : "Failed to resolve DNS records",
    };
  }
}

export async function checkDomainAvailability(domain: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  try {
    const normalizedDomain = domain.toLowerCase().trim();

    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
    if (!domainRegex.test(normalizedDomain)) {
      return {
        available: false,
        reason: "Invalid domain format",
      };
    }

    if (normalizedDomain.length > 253) {
      return {
        available: false,
        reason: "Domain name too long (max 253 characters)",
      };
    }

    const reservedDomains = [
      deploymentRootDomain,
      `www.${deploymentRootDomain}`,
      `api.${deploymentRootDomain}`,
      appHostname,
    ];

    if (reservedDomains.includes(normalizedDomain)) {
      return {
        available: false,
        reason: "This domain is reserved",
      };
    }

    return {
      available: true,
    };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function verifyDomainOwnership(
  domain: string,
  verificationToken: string,
): Promise<DomainVerificationResult> {
  const dnsResult = await verifyDomainDNS(domain, verificationToken);

  return dnsResult;
}

export function getDNSInstructions(
  domain: string,
  token: string,
): {
  type: string;
  host: string;
  value: string;
  ttl: number;
} {
  return {
    type: "TXT",
    host: `_coderocket-verify.${domain}`,
    value: token,
    ttl: 3600,
  };
}

export async function checkDomainCNAME(
  domain: string,
  expectedTarget: string,
): Promise<{
  configured: boolean;
  currentTarget?: string;
  error?: string;
}> {
  try {
    const cnameRecords = await dns.resolveCname(domain);

    if (cnameRecords.length === 0) {
      return {
        configured: false,
        error: "No CNAME record found",
      };
    }

    const currentTarget = cnameRecords[0];
    const configured =
      currentTarget.toLowerCase() === expectedTarget.toLowerCase();

    return {
      configured,
      currentTarget,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("ENOTFOUND")) {
      return {
        configured: false,
        error: "Domain not found",
      };
    }

    return {
      configured: false,
      error:
        error instanceof Error ? error.message : "Failed to check CNAME record",
    };
  }
}
