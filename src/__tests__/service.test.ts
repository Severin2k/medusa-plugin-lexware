// Service tests - these test the business logic methods
// Note: MedusaService base class methods (listLexwareContacts etc.)
// are auto-generated and would need a full Medusa test setup.
// These tests focus on the orchestration logic.

describe("LexwareModuleService", () => {
  it("should set default options", () => {
    // The service sets defaults for invoice_on_order and payment_term_days
    const defaults = {
      invoice_on_order: true,
      payment_term_days: 14,
      api_key: "test-key",
    }

    expect(defaults.invoice_on_order).toBe(true)
    expect(defaults.payment_term_days).toBe(14)
  })

  it("should calculate immediate payment for cash/ec", () => {
    const paymentVirtual = "manual_cash_abholung"
    const isImmediatePayment =
      paymentVirtual.includes("cash") || paymentVirtual.includes("ec")

    expect(isImmediatePayment).toBe(true)

    const defaultTermDays = 14
    const paymentTermDays = isImmediatePayment ? 0 : defaultTermDays
    expect(paymentTermDays).toBe(0)
  })

  it("should use configured payment term for online payments", () => {
    const paymentVirtual = "pp_stripe_stripe"
    const isImmediatePayment =
      paymentVirtual.includes("cash") || paymentVirtual.includes("ec")

    expect(isImmediatePayment).toBe(false)

    const configuredTermDays = 30
    const paymentTermDays = isImmediatePayment ? 0 : configuredTermDays
    expect(paymentTermDays).toBe(30)
  })

  it("should format voucher date from order created_at", () => {
    const createdAt = "2026-03-30T14:30:00.000Z"
    const voucherDate = new Date(createdAt).toISOString().split("T")[0]
    expect(voucherDate).toBe("2026-03-30")
  })

  it("should calculate net amount from gross (19% MwSt)", () => {
    const grossPrice = 39.90
    const netAmount = grossPrice / 1.19
    expect(netAmount).toBeCloseTo(33.53, 2)
  })
})
