import { LexwareApiClient } from "../../client/lexware-api"
import { LexwareApiError } from "../../client/types"

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

const originalFetch = global.fetch

beforeEach(() => {
  jest.clearAllMocks()
})

afterAll(() => {
  global.fetch = originalFetch
})

function mockFetch(responses: Array<{ status: number; body?: any; headers?: Record<string, string> }>) {
  let callIndex = 0
  global.fetch = jest.fn(async () => {
    const resp = responses[callIndex] || responses[responses.length - 1]
    callIndex++
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      text: async () => (resp.body !== undefined ? JSON.stringify(resp.body) : ""),
      arrayBuffer: async () => {
        const buf = Buffer.from("fake-pdf-content")
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      },
      headers: new Headers(resp.headers || {}),
    } as Response
  })
}

describe("LexwareApiClient", () => {
  describe("searchContact", () => {
    it("should return contact when found", async () => {
      const contact = { id: "abc-123", person: { firstName: "Max", lastName: "Muster" } }
      mockFetch([{ status: 200, body: { content: [contact], totalElements: 1 } }])

      const client = new LexwareApiClient("test-key", mockLogger)
      const result = await client.searchContact("max@example.com")

      expect(result).toEqual(contact)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/contacts?email=max%40example.com"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
          }),
        })
      )
    })

    it("should return null when no contact found", async () => {
      mockFetch([{ status: 200, body: { content: [], totalElements: 0 } }])

      const client = new LexwareApiClient("test-key", mockLogger)
      const result = await client.searchContact("unknown@example.com")

      expect(result).toBeNull()
    })
  })

  describe("createContact", () => {
    it("should create and return contact", async () => {
      const newContact = { id: "new-123" }
      mockFetch([{ status: 201, body: newContact }])

      const client = new LexwareApiClient("test-key", mockLogger)
      const result = await client.createContact({
        version: 0,
        roles: { customer: {} },
        person: { firstName: "Max", lastName: "Muster" },
        emailAddresses: { business: ["max@example.com"] },
      })

      expect(result).toEqual(newContact)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/contacts"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      )
    })
  })

  describe("createInvoice", () => {
    it("should create invoice with finalize=true", async () => {
      const invoice = { id: "inv-123", voucherNumber: "RE-2026-001" }
      mockFetch([{ status: 201, body: invoice }])

      const client = new LexwareApiClient("test-key", mockLogger)
      const result = await client.createInvoice(
        {
          voucherDate: "2026-03-30",
          address: { contactId: "contact-123" },
          lineItems: [
            {
              type: "custom",
              name: "Rosen",
              quantity: 1,
              unitName: "Stück",
              unitPrice: { currency: "EUR", netAmount: 33.61, taxRatePercentage: 19 },
            },
          ],
        },
        true
      )

      expect(result).toEqual(invoice)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/v1/invoices?finalize=true"),
        expect.anything()
      )
    })
  })

  describe("downloadInvoicePdf", () => {
    it("should return buffer", async () => {
      mockFetch([{ status: 200 }])

      const client = new LexwareApiClient("test-key", mockLogger)
      const result = await client.downloadInvoicePdf("inv-123")

      expect(Buffer.isBuffer(result)).toBe(true)
    })
  })

  describe("error handling", () => {
    it("should throw LexwareApiError on non-2xx response", async () => {
      mockFetch([{ status: 400, body: { message: "Bad Request" } }])

      const client = new LexwareApiClient("test-key", mockLogger)

      await expect(client.searchContact("test@example.com")).rejects.toThrow(LexwareApiError)
    })

    it("should retry on 429 with exponential backoff", async () => {
      mockFetch([
        { status: 429 },
        { status: 429 },
        { status: 200, body: { content: [], totalElements: 0 } },
      ])

      const client = new LexwareApiClient("test-key", mockLogger)
      const result = await client.searchContact("test@example.com")

      expect(result).toBeNull()
      expect(global.fetch).toHaveBeenCalledTimes(3)
      expect(mockLogger.warn).toHaveBeenCalledTimes(2)
    }, 30000)
  })

  describe("rate limiting", () => {
    it("should enforce minimum interval between calls", async () => {
      mockFetch([
        { status: 200, body: { content: [], totalElements: 0 } },
        { status: 200, body: { content: [], totalElements: 0 } },
      ])

      const client = new LexwareApiClient("test-key", mockLogger)

      const start = Date.now()
      await client.searchContact("a@example.com")
      await client.searchContact("b@example.com")
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(900) // ~1s between calls
    }, 10000)
  })
})
