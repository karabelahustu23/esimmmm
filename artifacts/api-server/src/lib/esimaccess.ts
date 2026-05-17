import { logger } from "./logger";

const BASE_URL = "https://api.esimaccess.com/api/v1/open";
const ACCESS_CODE = process.env.ESIM_ACCESS_CODE ?? "";

async function esimRequest<T>(path: string, body: unknown = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "RT-AccessCode": ACCESS_CODE,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error({ path, status: res.status, body: text }, "eSIMAccess API error");
    throw new Error(`eSIMAccess API error: ${res.status} ${text}`);
  }

  const data = await res.json() as { success: boolean; errorCode?: string; obj?: T; [key: string]: unknown };

  if (!data.success) {
    logger.error({ path, errorCode: data.errorCode, data }, "eSIMAccess API returned failure");
    throw new Error(`eSIMAccess API failure: ${data.errorCode ?? "unknown"}`);
  }

  return (data.obj ?? data) as T;
}

export interface EsimPackage {
  packageCode: string;
  name: string;
  slug: string;
  currencyCode: string;
  price: number;
  retailPrice: number;
  data: number;
  unusedValidDay: number;
  duration: number;
  durationUnit: string;
  locationCode: string;
  location: string;
  description: string;
  activeType: number;
  smsStatus: number;
  voice: number;
  speed: string;
}

export interface EsimOrderResult {
  orderNo: string;
  esimList?: EsimDetail[];
}

export interface EsimDetail {
  iccid: string;
  qrCodeUrl: string;
  shortUrl: string;
  ac: string;
  esimStatus: string;
  activateTime: string;
  expiredTime: string;
}

export interface EsimBalanceResult {
  balance: number;
}

export async function fetchPackages(locationCode = ""): Promise<EsimPackage[]> {
  const result = await esimRequest<{ packageList: EsimPackage[] }>("/package/list", {
    locationCode,
    type: "BASE",
  });
  return result.packageList ?? [];
}

export async function createEsimOrder(
  packageCode: string,
  price: number,
  count = 1
): Promise<EsimOrderResult> {
  const transactionId = crypto.randomUUID();
  return esimRequest<EsimOrderResult>("/esim/order", {
    transactionId,
    amount: price,
    packageInfoList: [{ packageCode, count, price }],
  });
}

export async function queryEsimDetail(orderNo: string): Promise<EsimDetail[]> {
  const result = await esimRequest<{ esimList: EsimDetail[] }>("/esim/query", {
    orderNo,
    pager: { pageNum: 1, pageSize: 50 },
  });
  return result.esimList ?? [];
}

export async function getBalance(): Promise<number> {
  const result = await esimRequest<EsimBalanceResult>("/balance/query");
  return (result.balance ?? 0) / 10000;
}

export async function topupEsim(
  iccid: string,
  packageCode: string,
  amount: number
): Promise<EsimOrderResult> {
  const transactionId = crypto.randomUUID();
  return esimRequest<EsimOrderResult>("/esim/topup", {
    iccid,
    packageCode,
    transactionId,
    amount,
  });
}

export async function suspendEsim(iccid: string): Promise<void> {
  await esimRequest("/esim/suspend", { iccid });
}

export async function unsuspendEsim(iccid: string): Promise<void> {
  await esimRequest("/esim/unsuspend", { iccid });
}

export async function revokeEsim(iccid: string): Promise<void> {
  await esimRequest("/esim/revoke", { iccid });
}
