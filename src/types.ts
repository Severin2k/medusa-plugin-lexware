export interface LexwarePluginOptions {
  /** Automatically create invoice on order.placed (default: true) */
  invoice_on_order?: boolean
  /** Payment term in days (default: 14). Set to 0 for immediate payment. */
  payment_term_days?: number
  /** Email address for error notifications */
  notification_email?: string
  /** HMAC license key for Pro features (offline validation) */
  license_key?: string
  /** Lemon Squeezy license key for Pro features (online validation) */
  lemon_squeezy_key?: string
  /** Instance name for Lemon Squeezy activation (default: medusa-<hostname>) */
  instance_name?: string
}

export interface CreateCustomerContactInput {
  id: string
  email: string
  company_name: string
  first_name: string
  last_name: string
  phone?: string
  vat_number?: string
  billing_address?: {
    address_1: string
    postal_code: string
    city: string
  }
}
