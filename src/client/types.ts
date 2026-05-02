// --- Contacts ---

export interface LexwareContactPerson {
  firstName: string
  lastName: string
}

export interface LexwareContactCompany {
  name: string
  vatRegistrationId?: string
  contactPersons?: {
    firstName: string
    lastName: string
    primary?: boolean
    emailAddress?: string
    phoneNumber?: string
  }[]
}

export interface LexwareContactAddress {
  street?: string
  zip?: string
  city?: string
  countryCode?: string
}

export interface LexwareContactResponse {
  id: string
  organizationId?: string
  version: number
  roles?: {
    customer?: Record<string, unknown>
    vendor?: Record<string, unknown>
  }
  company?: LexwareContactCompany
  person?: LexwareContactPerson
  addresses?: {
    billing?: LexwareContactAddress[]
    shipping?: LexwareContactAddress[]
  }
  emailAddresses?: {
    business?: string[]
    office?: string[]
    private?: string[]
    other?: string[]
  }
  note?: string
}

export interface LexwareContactsListResponse {
  content: LexwareContactResponse[]
  totalPages: number
  totalElements: number
  numberOfElements: number
}

export interface CreateContactPayload {
  version: number
  roles: {
    customer: Record<string, unknown>
  }
  person?: LexwareContactPerson
  company?: LexwareContactCompany
  addresses?: {
    billing?: LexwareContactAddress[]
    shipping?: LexwareContactAddress[]
  }
  emailAddresses?: {
    business?: string[]
  }
  phoneNumbers?: {
    business?: string[]
  }
  note?: string
}

// --- Invoices ---

export interface LexwareLineItem {
  type: "custom"
  name: string
  description?: string
  quantity: number
  unitName: string
  unitPrice: {
    currency: string
    netAmount?: number
    grossAmount?: number
    taxRatePercentage: number
  }
}

export interface CreateInvoicePayload {
  version?: number
  voucherDate: string
  address: {
    contactId: string
  }
  lineItems: LexwareLineItem[]
  totalPrice?: {
    currency: string
  }
  taxConditions?: {
    taxType: string
  }
  paymentConditions?: {
    paymentTermLabel: string
    paymentTermDuration: number
  }
  shippingConditions?: {
    shippingType: "service" | "delivery" | "serviceperiod" | "deliveryperiod" | "none"
    shippingDate?: string
    shippingEndDate?: string
  }
  introduction?: string
  remark?: string
}

export interface LexwareInvoiceResponse {
  id: string
  organizationId?: string
  voucherNumber?: string
  voucherDate?: string
  totalGrossAmount?: number
  totalNetAmount?: number
  totalTaxAmount?: number
  paymentStatus?: string
  voucherStatus?: string
}

// --- Credit Notes ---

export interface CreateCreditNotePayload {
  voucherDate: string
  address: {
    contactId: string
  }
  lineItems: LexwareLineItem[]
  totalPrice?: {
    currency: string
  }
  taxConditions?: {
    taxType: string
  }
  introduction?: string
  remark?: string
  precedingSalesVoucherId?: string
}

export interface LexwareCreditNoteResponse {
  id: string
  organizationId?: string
  voucherNumber?: string
  voucherDate?: string
  totalGrossAmount?: number
  totalNetAmount?: number
  totalTaxAmount?: number
  voucherStatus?: string
}

// --- Errors ---

export class LexwareApiError extends Error {
  constructor(
    public statusCode: number,
    public responseBody: string,
    public endpoint: string
  ) {
    super(`Lexware API error ${statusCode} on ${endpoint}: ${responseBody}`)
    this.name = "LexwareApiError"
  }
}
