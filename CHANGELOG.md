# Changelog

## 0.1.0 (2026-03-30)

### Features
- Automatic invoice creation in Lexware Office on order placement
- Contact management (find or create Lexware contacts from Medusa customers)
- PDF invoice download and email delivery
- Admin API for invoice management and manual retries
- Rate limiting (1 request/second) and exponential backoff on 429 errors
- Error notification emails on persistent failures
- Support for all payment methods (Stripe, PayPal, SEPA, cash, EC card)
- Configurable payment terms (immediate for cash/EC, configurable days for others)
