import {
  LexwareApiError,
  LexwareContactResponse,
  LexwareContactsListResponse,
  LexwareInvoiceResponse,
  CreateContactPayload,
  CreateInvoicePayload,
} from "./types.js"

const BASE_URL = process.env.LEXWARE_API_URL || "https://api.lexware.io"
const MIN_CALL_INTERVAL_MS = 1000
const MAX_RETRIES = 5
const INITIAL_BACKOFF_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class LexwareApiClient {
  private apiKey: string
  private lastCallTimestamp = 0
  private logger: any

  constructor(apiKey: string, logger: any) {
    this.apiKey = apiKey
    this.logger = logger
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastCallTimestamp
    if (elapsed < MIN_CALL_INTERVAL_MS) {
      await sleep(MIN_CALL_INTERVAL_MS - elapsed)
    }
    this.lastCallTimestamp = Date.now()
  }

  private async requestWithRetry<T>(
    method: string,
    path: string,
    body?: any,
    responseType: "json" | "buffer" = "json"
  ): Promise<T> {
    let lastError: Error | null = null
    let retries503 = 0
    const MAX_503_RETRIES = 3

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await this.enforceRateLimit()

      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: responseType === "json" ? "application/json" : "application/pdf",
        }

        if (body) {
          headers["Content-Type"] = "application/json"
        }

        const response = await fetch(`${BASE_URL}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        })

        if (response.status === 429) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
          this.logger.warn(
            `lexware: Rate limited (429) on ${method} ${path}, retry ${attempt + 1}/${MAX_RETRIES} in ${backoff}ms`
          )
          await sleep(backoff)
          continue
        }

        if (response.status === 503) {
          retries503++
          if (retries503 >= MAX_503_RETRIES) {
            const responseBody = await response.text()
            this.logger.error(
              `[lexware] Alle 3 Versuche fehlgeschlagen für ${method} ${path}`
            )
            throw new LexwareApiError(503, responseBody, `${method} ${path}`)
          }
          const waitMs = 2000 * Math.pow(2, retries503 - 1)
          const waitSec = waitMs / 1000
          this.logger.warn(
            `[lexware] 503 erhalten, Versuch ${retries503}/3, warte ${waitSec}s`
          )
          await sleep(waitMs)
          continue
        }

        if (!response.ok) {
          const responseBody = await response.text()
          throw new LexwareApiError(response.status, responseBody, `${method} ${path}`)
        }

        if (responseType === "buffer") {
          const arrayBuffer = await response.arrayBuffer()
          return Buffer.from(arrayBuffer) as T
        }

        const text = await response.text()
        if (!text) return {} as T
        return JSON.parse(text) as T
      } catch (err) {
        if (err instanceof LexwareApiError) {
          throw err
        }
        lastError = err as Error
        if (attempt < MAX_RETRIES - 1) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
          this.logger.warn(
            `lexware: Request failed on ${method} ${path}, retry ${attempt + 1}/${MAX_RETRIES} in ${backoff}ms: ${lastError.message}`
          )
          await sleep(backoff)
        }
      }
    }

    throw lastError || new Error(`lexware: All ${MAX_RETRIES} retries failed for ${method} ${path}`)
  }

  async searchContact(email: string): Promise<LexwareContactResponse | null> {
    const result = await this.requestWithRetry<LexwareContactsListResponse>(
      "GET",
      `/v1/contacts?email=${encodeURIComponent(email)}`
    )
    if (result.content && result.content.length > 0) {
      return result.content[0]
    }
    return null
  }

  async createContact(data: CreateContactPayload): Promise<LexwareContactResponse> {
    const result = await this.requestWithRetry<LexwareContactResponse>(
      "POST",
      "/v1/contacts",
      data
    )
    return result
  }

  async getContact(contactId: string): Promise<LexwareContactResponse> {
    return this.requestWithRetry<LexwareContactResponse>(
      "GET",
      `/v1/contacts/${encodeURIComponent(contactId)}`
    )
  }

  async updateContact(contactId: string, data: CreateContactPayload): Promise<LexwareContactResponse> {
    return this.requestWithRetry<LexwareContactResponse>(
      "PUT",
      `/v1/contacts/${encodeURIComponent(contactId)}`,
      data
    )
  }

  async createInvoice(
    data: CreateInvoicePayload,
    finalize: boolean = true
  ): Promise<LexwareInvoiceResponse> {
    const query = finalize ? "?finalize=true" : ""
    const createResult = await this.requestWithRetry<{ id: string; resourceUri?: string }>(
      "POST",
      `/v1/invoices${query}`,
      data
    )

    // Fetch the full invoice to get voucherNumber etc.
    const invoice = await this.requestWithRetry<LexwareInvoiceResponse>(
      "GET",
      `/v1/invoices/${createResult.id}`
    )
    return invoice
  }

  async downloadInvoicePdf(invoiceId: string): Promise<Buffer> {
    const result = await this.requestWithRetry<Buffer>(
      "GET",
      `/v1/invoices/${encodeURIComponent(invoiceId)}/file`,
      undefined,
      "buffer"
    )
    return result
  }

  async getInvoice(invoiceId: string): Promise<LexwareInvoiceResponse> {
    return this.requestWithRetry<LexwareInvoiceResponse>(
      "GET",
      `/v1/invoices/${encodeURIComponent(invoiceId)}`
    )
  }

  async updateInvoice(invoiceId: string, data: CreateInvoicePayload): Promise<LexwareInvoiceResponse> {
    await this.requestWithRetry<{ id: string }>(
      "PUT",
      `/v1/invoices/${encodeURIComponent(invoiceId)}`,
      data
    )
    return this.getInvoice(invoiceId)
  }

  async finalizeInvoice(invoiceId: string): Promise<LexwareInvoiceResponse> {
    const result = await this.requestWithRetry<{ id: string; resourceUri?: string }>(
      "POST",
      `/v1/invoices/${encodeURIComponent(invoiceId)}?finalize=true`
    )
    return this.getInvoice(result.id || invoiceId)
  }

  async createDunning(precedingInvoiceId: string): Promise<{ id: string }> {
    return this.requestWithRetry<{ id: string }>(
      "POST",
      "/v1/dunnings",
      { precedingSalesVoucherId: precedingInvoiceId }
    )
  }

  async getProfile(): Promise<{ organizationId: string; companyName?: string }> {
    return this.requestWithRetry<{ organizationId: string; companyName?: string }>(
      "GET",
      "/v1/profile"
    )
  }

  async createEventSubscription(
    eventType: string,
    callbackUrl: string
  ): Promise<{ subscriptionId: string }> {
    const result = await this.requestWithRetry<any>(
      "POST",
      "/v1/event-subscriptions",
      { eventType, callbackUrl }
    )
    // Lexware gibt { subscriptionId } direkt oder { content: [{ subscriptionId }] } zurück
    if (result.subscriptionId) return result
    if (result.content?.[0]?.subscriptionId) return result.content[0]
    return result
  }

  async deleteEventSubscription(subscriptionId: string): Promise<void> {
    await this.requestWithRetry<void>(
      "DELETE",
      `/v1/event-subscriptions/${encodeURIComponent(subscriptionId)}`
    )
  }
}
