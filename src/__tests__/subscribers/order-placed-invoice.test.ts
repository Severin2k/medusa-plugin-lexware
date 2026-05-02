describe("orderPlacedLexwareInvoice subscriber", () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  const mockLexwareService = {
    options: { invoice_on_order: true, api_key: "test", payment_term_days: 14 },
    processOrderInvoice: jest.fn(),
  }

  const mockContainer = {
    resolve: jest.fn((key: string) => {
      if (key === "logger") return mockLogger
      if (key === "lexware") return mockLexwareService
      return null
    }),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should call processOrderInvoice when invoice_on_order is true", async () => {
    // Dynamically import to allow mocking
    const { default: handler } = await import("../../subscribers/order-placed-invoice")

    await handler({
      event: { data: { id: "order_123" }, name: "order.placed" } as any,
      container: mockContainer as any,
    })

    expect(mockLexwareService.processOrderInvoice).toHaveBeenCalledWith(
      "order_123",
      mockContainer
    )
  })

  it("should skip when invoice_on_order is false", async () => {
    mockLexwareService.options.invoice_on_order = false

    const { default: handler } = await import("../../subscribers/order-placed-invoice")

    await handler({
      event: { data: { id: "order_123" }, name: "order.placed" } as any,
      container: mockContainer as any,
    })

    expect(mockLexwareService.processOrderInvoice).not.toHaveBeenCalled()

    // Reset
    mockLexwareService.options.invoice_on_order = true
  })

  it("should catch and log errors without throwing", async () => {
    mockLexwareService.processOrderInvoice.mockRejectedValueOnce(
      new Error("API down")
    )

    const { default: handler } = await import("../../subscribers/order-placed-invoice")

    // Should not throw
    await handler({
      event: { data: { id: "order_456" }, name: "order.placed" } as any,
      container: mockContainer as any,
    })

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("order_456")
    )
  })
})
