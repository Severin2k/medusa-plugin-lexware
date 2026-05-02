# medusa-plugin-lexware

Lexware Office invoice integration for Medusa v2. Automatically creates invoices in Lexware Office when orders are placed, manages contacts, downloads invoice PDFs, and sends them to customers via email.

## Features

- **Automatic Invoice Creation** — Creates a Lexware invoice on every `order.placed` event
- **Contact Management** — Finds or creates Lexware contacts from Medusa customer data
- **PDF Delivery** — Downloads invoice PDFs from Lexware and emails them to customers
- **Admin API** — View invoice status, retry failed invoices, download PDFs
- **Rate Limiting** — Enforces 1 request/second with exponential backoff on 429 errors
- **Error Notifications** — Sends email alerts when invoice creation fails
- **All Payment Methods** — Works with Stripe, PayPal, SEPA, cash, and EC card payments

## Requirements

- Medusa v2 (>= 2.10.0)
- Node.js >= 20
- Lexware Office API key
- SMTP server for sending invoice emails

## Installation

```bash
npm install medusa-plugin-lexware
```

## Configuration

### 1. Environment Variables

Add to your `.env` file:

```env
LEXWARE_API_KEY=your_lexware_api_key_here
LEXWARE_NOTIFICATION_EMAIL=info@your-shop.com
```

### 2. Medusa Configuration

Add the plugin to your `medusa-config.ts`:

```typescript
import { LEXWARE_MODULE } from "medusa-plugin-lexware"

export default defineConfig({
  // ...
  modules: [
    // your other modules...
    {
      resolve: "medusa-plugin-lexware",
      key: LEXWARE_MODULE,
      options: {
        api_key: process.env.LEXWARE_API_KEY,
        invoice_on_order: true,
        payment_term_days: 14,
        notification_email: process.env.LEXWARE_NOTIFICATION_EMAIL,
      },
    },
  ],
})
```

### 3. Run Migrations

```bash
npx medusa db:migrate
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `api_key` | `string` | **required** | Lexware Office API key (Bearer token) |
| `invoice_on_order` | `boolean` | `true` | Automatically create invoice on order placement |
| `payment_term_days` | `number` | `14` | Payment term in days (0 = immediate) |
| `notification_email` | `string` | — | Email for error notifications |

## How It Works

When an order is placed:

1. **Find/Create Contact** — Checks if customer exists in Lexware (by email), creates if not
2. **Create Invoice** — Builds invoice with line items, tax (19% MwSt), and payment terms
3. **Download PDF** — Fetches the finalized invoice PDF from Lexware
4. **Send Email** — Emails the PDF to the customer as an attachment
5. **Store Reference** — Saves the Lexware invoice ID for future reference

### Payment Terms

- **Cash / EC card** — Immediate payment (0 days)
- **All other methods** — Configurable via `payment_term_days` (default: 14 days)

## Admin API

All endpoints require admin authentication.

### List Invoices
```
GET /admin/lexware/invoices?status=created&limit=20&offset=0
```

### Get Invoice Status
```
GET /admin/lexware/invoices/:orderId
```

### Retry Invoice Creation
```
POST /admin/lexware/invoices/:orderId
```

### Download Invoice PDF
```
GET /admin/lexware/invoices/:orderId/pdf
```

### Get Customer Contact
```
GET /admin/lexware/contacts/:customerId
```

## Error Handling

- **Rate Limiting** — 1 second pause between every Lexware API call
- **Retry Logic** — Exponential backoff on 429 errors (1s, 2s, 4s, 8s, 16s — max 5 retries)
- **Error Notifications** — Sends email to `notification_email` on persistent failures
- **Data Safety** — Lexware IDs only stored after confirmed API success (HTTP 200/201)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint
npm run lint

# Build
npm run build
```

## License

MIT
