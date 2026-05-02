import { MedusaService } from "@medusajs/framework/utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import * as nodemailer from "nodemailer"
import LexwareContact from "./models/lexware-contact.js"
import LexwareInvoice from "./models/lexware-invoice.js"
import LexwareSettings from "./models/lexware-settings.js"
import LexwareCreditNote from "./models/lexware-credit-note.js"
import { LexwareApiClient } from "./client/lexware-api.js"
import { CreateContactPayload, CreateInvoicePayload, CreateCreditNotePayload, LexwareApiError } from "./client/types.js"
import { LexwarePluginOptions } from "./types.js"
import { encrypt, decrypt } from "./lib/crypto.js"

class LexwareModuleService extends MedusaService({
  LexwareContact,
  LexwareInvoice,
  LexwareSettings,
  LexwareCreditNote,
}) {
  private options_: LexwarePluginOptions
  private client_: LexwareApiClient | null = null

  constructor(_: any, options: LexwarePluginOptions) {
    super(...arguments)
    this.options_ = {
      invoice_on_order: true,
      payment_term_days: 14,
      ...options,
    }
  }

  get options(): LexwarePluginOptions {
    return this.options_
  }

  private async getClient(logger: any): Promise<LexwareApiClient> {
    if (!this.client_) {
      const apiKey = await this.getDecryptedApiKey()
      if (!apiKey) {
        throw new Error("lexware: API Key nicht konfiguriert — bitte im Admin unter Lexware eintragen")
      }
      this.client_ = new LexwareApiClient(apiKey, logger)
    }
    return this.client_
  }

  async getApiClient(logger: any): Promise<LexwareApiClient> {
    return this.getClient(logger)
  }

  async buildMailTransporter(): Promise<nodemailer.Transporter | null> {
    const results = await this.listLexwareSettings({}, { take: 1 })
    const settings = results?.[0] as any

    const host = settings?.smtp_host
    const user = settings?.smtp_user
    if (!host || !user) return null

    let pass: string | undefined
    if (settings.smtp_pass_encrypted && settings.smtp_pass_iv && settings.smtp_pass_tag) {
      try {
        pass = decrypt(settings.smtp_pass_encrypted, settings.smtp_pass_iv, settings.smtp_pass_tag)
      } catch {
        return null
      }
    }

    return nodemailer.createTransport({
      host,
      port: settings.smtp_port || 587,
      secure: settings.smtp_secure ?? false,
      auth: { user, pass },
    })
  }

  async getSettings(): Promise<{
    has_api_key: boolean
    api_key_created_at: string | null
    invoice_on_order: boolean
    payment_due_days: number
    payment_conditions: Record<string, { type: string; days?: number }> | null
    webhook_subscription_id: string | null
    dry_run: boolean
    smtp_host: string | null
    smtp_port: number | null
    smtp_secure: boolean | null
    smtp_user: string | null
    has_smtp_pass: boolean
    notification_email: string | null
  }> {
    const results = await this.listLexwareSettings({}, { take: 1 })
    const settings = results?.[0] as any
    if (!settings) {
      return {
        has_api_key: false,
        api_key_created_at: null,
        invoice_on_order: this.options_.invoice_on_order ?? true,
        payment_due_days: this.options_.payment_term_days ?? 14,
        payment_conditions: null,
        webhook_subscription_id: null,
        dry_run: false,
        smtp_host: null,
        smtp_port: null,
        smtp_secure: null,
        smtp_user: null,
        has_smtp_pass: false,
        notification_email: null,
      }
    }

    let paymentConditions: Record<string, { type: string; days?: number }> | null = null
    if (settings.payment_conditions) {
      try {
        paymentConditions = JSON.parse(settings.payment_conditions)
      } catch {
        paymentConditions = null
      }
    }

    return {
      has_api_key: !!settings.api_key_encrypted,
      api_key_created_at: settings.api_key_created_at
        ? new Date(settings.api_key_created_at).toISOString()
        : null,
      invoice_on_order: settings.invoice_on_order,
      payment_due_days: settings.payment_due_days,
      payment_conditions: paymentConditions,
      webhook_subscription_id: settings.webhook_subscription_id || null,
      dry_run: settings.dry_run ?? false,
      smtp_host: settings.smtp_host || null,
      smtp_port: settings.smtp_port || null,
      smtp_secure: settings.smtp_secure ?? null,
      smtp_user: settings.smtp_user || null,
      has_smtp_pass: !!settings.smtp_pass_encrypted,
      notification_email: settings.notification_email || null,
    }
  }

  async getDecryptedApiKey(): Promise<string | null> {
    const results = await this.listLexwareSettings({}, { take: 1 })
    const settings = results?.[0]
    if (
      settings?.api_key_encrypted &&
      settings?.api_key_iv &&
      settings?.api_key_tag
    ) {
      return decrypt(
        settings.api_key_encrypted,
        settings.api_key_iv,
        settings.api_key_tag
      )
    }
    return null
  }

  async upsertSettings(data: {
    api_key?: string
    invoice_on_order?: boolean
    payment_due_days?: number
    payment_conditions?: Record<string, { type: string; days?: number }>
    dry_run?: boolean
    smtp_host?: string
    smtp_port?: number
    smtp_secure?: boolean
    smtp_user?: string
    smtp_pass?: string
    notification_email?: string
  }): Promise<void> {
    const results = await this.listLexwareSettings({}, { take: 1 })
    const existing = results?.[0] as any

    const updateData: Record<string, any> = {}

    if (data.api_key) {
      const { encrypted, iv, tag } = encrypt(data.api_key)
      updateData.api_key_encrypted = encrypted
      updateData.api_key_iv = iv
      updateData.api_key_tag = tag
      updateData.api_key_created_at = new Date()
      // Invalidate cached client so new key is used
      this.client_ = null
    }

    if (data.invoice_on_order !== undefined) {
      updateData.invoice_on_order = data.invoice_on_order
    }

    if (data.payment_due_days !== undefined) {
      updateData.payment_due_days = data.payment_due_days
    }

    if (data.dry_run !== undefined) {
      updateData.dry_run = data.dry_run
    }

    if (data.smtp_host !== undefined) updateData.smtp_host = data.smtp_host || null
    if (data.smtp_port !== undefined) updateData.smtp_port = data.smtp_port || null
    if (data.smtp_secure !== undefined) updateData.smtp_secure = data.smtp_secure
    if (data.smtp_user !== undefined) updateData.smtp_user = data.smtp_user || null
    if (data.notification_email !== undefined) updateData.notification_email = data.notification_email || null

    if (data.smtp_pass) {
      const { encrypted, iv, tag } = encrypt(data.smtp_pass)
      updateData.smtp_pass_encrypted = encrypted
      updateData.smtp_pass_iv = iv
      updateData.smtp_pass_tag = tag
    }

    if (data.payment_conditions !== undefined) {
      // Merge with existing conditions to preserve settings for providers not in the current request
      let merged = data.payment_conditions
      if (existing?.payment_conditions) {
        try {
          const existingConditions = JSON.parse(existing.payment_conditions)
          merged = { ...existingConditions, ...data.payment_conditions }
        } catch {
          // ignore parse errors
        }
      }
      updateData.payment_conditions = JSON.stringify(merged)
    }

    if (existing) {
      await this.updateLexwareSettings({ id: existing.id, ...updateData })
    } else {
      await this.createLexwareSettings({
        invoice_on_order: data.invoice_on_order ?? true,
        payment_due_days: data.payment_due_days ?? 14,
        ...updateData,
      })
    }
  }

  async findOrCreateContact(
    customerData: {
      customer_id?: string
      email: string
      first_name?: string
      last_name?: string
      company?: string
      billing_address?: {
        address_1?: string
        postal_code?: string
        city?: string
        country_code?: string
      }
      shipping_address?: {
        address_1?: string
        postal_code?: string
        city?: string
        country_code?: string
      }
    },
    logger: any
  ): Promise<string> {
    // 1. Check local DB first — by customer_id (registrierte Kunden)
    if (customerData.customer_id) {
      const existing = await this.listLexwareContacts(
        { customer_id: customerData.customer_id },
        { take: 1 }
      )
      if (existing && existing.length > 0) {
        logger.info(`[lexware] Kontakt für ${customerData.email} bereits vorhanden, verwende ${existing[0].lexware_contact_id}`)
        return existing[0].lexware_contact_id
      }
    }

    // 2. Check local DB by email (Gäste + wiederkehrende Kunden)
    const existingByEmail = await this.listLexwareContacts(
      { email: customerData.email },
      { take: 1 }
    )
    if (existingByEmail && existingByEmail.length > 0) {
      logger.info(`[lexware] Kontakt für ${customerData.email} bereits vorhanden, verwende ${existingByEmail[0].lexware_contact_id}`)
      return existingByEmail[0].lexware_contact_id
    }

    const client = await this.getClient(logger)

    // 3. Search in Lexware by email
    const existingContact = await client.searchContact(customerData.email)
    if (existingContact) {
      logger.info(`lexware: Found existing Lexware contact for ${customerData.email}: ${existingContact.id}`)

      // Update billing address to exactly one (Lexware requires this for invoices)
      const billing = customerData.billing_address
      if (billing) {
        try {
          const fullContact = await client.getContact(existingContact.id)
          await client.updateContact(existingContact.id, {
            version: fullContact.version,
            roles: fullContact.roles as any || { customer: {} },
            person: fullContact.person,
            company: fullContact.company,
            addresses: {
              billing: [
                {
                  street: billing.address_1 || undefined,
                  zip: billing.postal_code || undefined,
                  city: billing.city || undefined,
                  countryCode: billing.country_code?.toUpperCase() || undefined,
                },
              ],
              shipping: fullContact.addresses?.shipping?.slice(0, 1),
            },
            emailAddresses: fullContact.emailAddresses as any,
          })
          logger.info(`lexware: Updated billing address for contact ${existingContact.id}`)
        } catch (e: any) {
          logger.warn(`lexware: Could not update contact addresses: ${e.message}`)
        }
      }

      // Store mapping locally (auch für Gäste)
      try {
        await this.createLexwareContacts({
          customer_id: customerData.customer_id || null,
          email: customerData.email,
          lexware_contact_id: existingContact.id,
        })
        logger.info(`[lexware] Neuer Lexware-Kontakt für ${customerData.email} angelegt: ${existingContact.id}`)
      } catch (e: any) {
        if (
          e?.code === "23505" ||
          e?.message?.includes("unique") ||
          e?.message?.includes("duplicate") ||
          e?.detail?.includes("already exists")
        ) {
          logger.info(`[lexware] Kontakt für ${customerData.email} bereits vorhanden (concurrent), verwende ${existingContact.id}`)
        } else {
          throw e
        }
      }
      return existingContact.id
    }

    // 4. Create new contact in Lexware
    const payload: CreateContactPayload = {
      version: 0,
      roles: { customer: {} },
      emailAddresses: {
        business: [customerData.email],
      },
    }

    const isCompany = !!customerData.company?.trim()

    if (isCompany) {
      payload.company = {
        name: customerData.company!,
        ...(customerData.first_name || customerData.last_name
          ? {
              contactPersons: [
                {
                  firstName: customerData.first_name || "",
                  lastName: customerData.last_name || "",
                  primary: true,
                  emailAddress: customerData.email,
                },
              ],
            }
          : {}),
      }
    } else if (customerData.first_name || customerData.last_name) {
      payload.person = {
        firstName: customerData.first_name || "",
        lastName: customerData.last_name || "",
      }
    }

    const billing = customerData.billing_address
    const shipping = customerData.shipping_address

    if (billing || shipping) {
      payload.addresses = {}
      if (billing) {
        payload.addresses.billing = [
          {
            street: billing.address_1 || undefined,
            zip: billing.postal_code || undefined,
            city: billing.city || undefined,
            countryCode: billing.country_code?.toUpperCase() || undefined,
          },
        ]
      }
      if (shipping) {
        payload.addresses.shipping = [
          {
            street: shipping.address_1 || undefined,
            zip: shipping.postal_code || undefined,
            city: shipping.city || undefined,
            countryCode: shipping.country_code?.toUpperCase() || undefined,
          },
        ]
      }
    }

    const newContact = await client.createContact(payload)
    logger.info(`[lexware] Neuer Lexware-Kontakt für ${customerData.email} angelegt: ${newContact.id}`)

    // Store mapping locally (auch für Gäste mit customer_id = null)
    try {
      await this.createLexwareContacts({
        customer_id: customerData.customer_id || null,
        email: customerData.email,
        lexware_contact_id: newContact.id,
      })
    } catch (e: any) {
      if (
        e?.code === "23505" ||
        e?.message?.includes("unique") ||
        e?.message?.includes("duplicate") ||
        e?.detail?.includes("already exists")
      ) {
        logger.info(`[lexware] Kontakt für ${customerData.email} bereits vorhanden (concurrent), verwende ${newContact.id}`)
      } else {
        throw e
      }
    }

    return newContact.id
  }

  async processOrderInvoice(orderId: string, container: any, isRetry = false, options?: { taxRateOverride?: (order: any, item: any, defaultRate: number) => number }): Promise<{ pdfBuffer: Buffer | null; voucherNumber: string | null; invoiceId: string | null } | null> {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    // Idempotency check: if an invoice record already exists, handle accordingly
    const existingInvoices = await this.listLexwareInvoices(
      { order_id: orderId },
      { take: 1 }
    )

    let invoiceRecord: any

    if (existingInvoices && existingInvoices.length > 0) {
      const existing = existingInvoices[0]

      if (existing.status === "created") {
        logger.info(`[lexware] Rechnung für Order ${orderId} bereits vorhanden, überspringe`)
        return null
      }

      if (!isRetry) {
        // Not a retry — another process is handling this or it failed before
        logger.info(`[lexware] Rechnung für Order ${orderId} bereits vorhanden (Status: ${existing.status}), überspringe`)
        return null
      }

      // Retry: reset the failed record to pending
      await this.updateLexwareInvoices({
        id: existing.id,
        status: "pending",
        error_message: null,
        retry_count: (existing.retry_count || 0) + 1,
      })
      invoiceRecord = existing
    } else {
      // Claim this order by creating a pending record BEFORE the API call.
      // The unique constraint on order_id guards against race conditions.
      try {
        invoiceRecord = await this.createLexwareInvoices({
          order_id: orderId,
          status: "pending",
        })
      } catch (err: any) {
        // Unique constraint violation = another process already claimed this order
        if (
          err?.code === "23505" ||
          err?.message?.includes("unique") ||
          err?.message?.includes("duplicate") ||
          err?.detail?.includes("already exists")
        ) {
          logger.info(`[lexware] Rechnung für Order ${orderId} bereits vorhanden (concurrent), überspringe`)
          return null
        }
        throw err
      }
    }

    // Fetch order data
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "subtotal",
        "shipping_total",
        "currency_code",
        "metadata",
        "created_at",
        "customer_id",
        "billing_address.first_name",
        "billing_address.last_name",
        "billing_address.company",
        "billing_address.address_1",
        "billing_address.address_2",
        "billing_address.postal_code",
        "billing_address.city",
        "billing_address.country_code",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.postal_code",
        "shipping_address.city",
        "shipping_address.country_code",
        "items.*",
      ],
      filters: { id: orderId },
    })

    const order = orders[0] as any
    if (!order) {
      logger.error(`lexware: Order ${orderId} not found`)
      return null
    }

    try {
      // Step 1: Find or create contact
      const contactId = await this.findOrCreateContact(
        {
          customer_id: order.customer_id || undefined,
          email: order.email,
          first_name: order.billing_address?.first_name,
          last_name: order.billing_address?.last_name,
          company: order.billing_address?.company,
          billing_address: order.billing_address,
          shipping_address: order.shipping_address,
        },
        logger
      )

      // Step 2: Build invoice payload — Zahlungsziel berechnen
      const paymentVirtual = (order.metadata?.payment_method_virtual as string) || ""
      const settings = await this.getSettings()
      const defaultDays = settings.payment_due_days
      const conditions = settings.payment_conditions || {}

      // Effektive Zahlungsmethode: virtuelle Methode hat Vorrang, dann Provider-ID
      let paymentProviderId = ""
      try {
        const { data: payCollections } = await query.graph({
          entity: "order_payment_collection",
          fields: ["payment_collection_id"],
          filters: { order_id: orderId },
        })
        if (payCollections?.[0]?.payment_collection_id) {
          const { data: sessions } = await query.graph({
            entity: "payment_session",
            fields: ["provider_id"],
            filters: {
              payment_collection_id: payCollections[0].payment_collection_id,
              status: "authorized",
            },
          })
          paymentProviderId = sessions?.[0]?.provider_id || ""
        }
      } catch {
        // Fallback: kein Provider ermittelbar
      }

      const effectiveMethod = paymentVirtual || paymentProviderId
      const condition = conditions[effectiveMethod] || conditions[paymentProviderId]

      let paymentTermDays: number
      let paymentTermLabel: string

      if (condition) {
        switch (condition.type) {
          case "immediate":
            paymentTermDays = 0
            paymentTermLabel = "Sofort fällig"
            break
          case "delivery_date": {
            const deliveryDate = order.metadata?.delivery_date || order.metadata?.pickup_date
            if (deliveryDate) {
              const delivery = new Date(deliveryDate)
              const today = new Date()
              const diffMs = delivery.getTime() - today.getTime()
              paymentTermDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
              paymentTermLabel = `Fällig am ${delivery.toLocaleDateString("de-DE")}`
            } else {
              paymentTermDays = defaultDays
              paymentTermLabel = `Zahlbar innerhalb von ${defaultDays} Tagen`
            }
            break
          }
          case "days":
            paymentTermDays = condition.days ?? defaultDays
            paymentTermLabel = paymentTermDays === 0
              ? "Sofort fällig"
              : `Zahlbar innerhalb von ${paymentTermDays} Tagen`
            break
          default:
            paymentTermDays = defaultDays
            paymentTermLabel = `Zahlbar innerhalb von ${defaultDays} Tagen`
            break
        }
      } else {
        // Fallback: alte Logik für Abwärtskompatibilität
        const isImmediatePayment =
          paymentVirtual.includes("cash") || paymentVirtual.includes("ec")
        paymentTermDays = isImmediatePayment ? 0 : defaultDays
        paymentTermLabel = paymentTermDays === 0
          ? "Sofort fällig"
          : `Zahlbar innerhalb von ${paymentTermDays} Tagen`
      }

      logger.info(`[lexware] Zahlungsziel für ${effectiveMethod || "unbekannt"}: ${paymentTermDays} Tage (${condition?.type || "standard"})`)

      // Look up tax rates per product via tax_rate_rule
      const taxRateMap = await this.buildTaxRateMap(
        (order.items || []).map((item: any) => item.product_id),
        container
      )

      const currency = order.currency_code?.toUpperCase() || "EUR"

      const lineItems = (order.items || []).map((item: any) => {
        const defaultRate = taxRateMap.get(item.product_id) ?? 19
        const taxRate = options?.taxRateOverride
          ? options.taxRateOverride(order, item, defaultRate)
          : defaultRate
        return {
          type: "custom" as const,
          name: item.product_title || item.title || "Artikel",
          description: item.variant_title || undefined,
          quantity: item.quantity || 1,
          unitName: "Stück",
          unitPrice: {
            currency,
            grossAmount: item.unit_price,
            taxRatePercentage: taxRate,
          },
        }
      })

      // Add shipping as line item if > 0
      if (order.shipping_total && order.shipping_total > 0) {
        lineItems.push({
          type: "custom" as const,
          name: "Versand",
          quantity: 1,
          unitName: "Pauschal",
          unitPrice: {
            currency,
            grossAmount: order.shipping_total,
            taxRatePercentage: 19,
          },
        })
      }

      const voucherDate = order.created_at
        ? new Date(order.created_at).toISOString()
        : new Date().toISOString()

      const invoicePayload: CreateInvoicePayload = {
        voucherDate,
        address: { contactId },
        lineItems,
        totalPrice: {
          currency,
        },
        taxConditions: {
          taxType: "gross",
        },
        paymentConditions: {
          paymentTermLabel,
          paymentTermDuration: paymentTermDays,
        },
        shippingConditions: {
          shippingType: "none",
        },
        introduction: `Rechnung zu Bestellung #${order.display_id}`,
        remark: "Vielen Dank für Ihre Bestellung!",
      }

      const client = await this.getClient(logger)
      const isDryRun = settings.dry_run

      // Step 3: Create invoice in Lexware (draft if dry_run)
      const lexwareInvoice = await client.createInvoice(invoicePayload, !isDryRun)

      if (isDryRun) {
        logger.info(
          `[lexware] DRY RUN: Entwurf erstellt fuer Order #${order.display_id}: ${lexwareInvoice.id} (nicht finalisiert, kein PDF)`
        )
        await this.updateLexwareInvoices({
          id: invoiceRecord.id,
          lexware_invoice_id: lexwareInvoice.id,
          lexware_voucher_number: null,
          status: "draft",
          error_message: null,
        })
        return {
          pdfBuffer: null,
          voucherNumber: null,
          invoiceId: lexwareInvoice.id,
        }
      }

      logger.info(
        `lexware: Invoice created for order #${order.display_id}: ${lexwareInvoice.id} (${lexwareInvoice.voucherNumber})`
      )

      // Step 4: Update record with Lexware data (only after confirmed success)
      await this.updateLexwareInvoices({
        id: invoiceRecord.id,
        lexware_invoice_id: lexwareInvoice.id,
        lexware_voucher_number: lexwareInvoice.voucherNumber || null,
        status: "created",
        error_message: null,
      })

      // Step 5: Download PDF
      try {
        const pdfBuffer = await client.downloadInvoicePdf(lexwareInvoice.id)

        await this.updateLexwareInvoices({
          id: invoiceRecord.id,
          pdf_sent: true,
        })

        logger.info(
          `lexware: Invoice PDF downloaded for order #${order.display_id}`
        )

        // Return PDF data for attachment in confirmation email
        return {
          pdfBuffer,
          voucherNumber: lexwareInvoice.voucherNumber || null,
          invoiceId: lexwareInvoice.id,
        }
      } catch (pdfErr) {
        logger.error(
          `lexware: PDF download failed for order #${order.display_id}: ${pdfErr}`
        )
        return {
          pdfBuffer: null,
          voucherNumber: lexwareInvoice.voucherNumber || null,
          invoiceId: lexwareInvoice.id,
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.error(`lexware: Invoice creation failed for order #${order.display_id}: ${errorMessage}`)

      const is503 = err instanceof LexwareApiError && err.statusCode === 503
      const status = is503 ? "error" : "failed"
      const message503 = `Lexware nicht erreichbar nach 3 Versuchen: 503 Service Unavailable`

      if (is503) {
        logger.error(`[lexware] Alle 3 Versuche fehlgeschlagen für Order ${orderId}`)
      }

      await this.updateLexwareInvoices({
        id: invoiceRecord.id,
        status,
        error_message: is503 ? message503 : errorMessage,
        ...(is503 ? { retry_count: (invoiceRecord.retry_count || 0) + 1 } : {}),
      })

      // Send notification email on failure
      await this.sendErrorNotification(order.display_id, orderId, is503 ? message503 : errorMessage, logger)
      return null
    }
  }

  async retryFailedInvoice(orderId: string, container: any, options?: { taxRateOverride?: (order: any, item: any, defaultRate: number) => number }): Promise<{ pdfBuffer: Buffer | null; voucherNumber: string | null; invoiceId: string | null } | null> {
    return this.processOrderInvoice(orderId, container, true, options)
  }

  async getInvoiceByOrderId(orderId: string): Promise<any | null> {
    const results = await this.listLexwareInvoices(
      { order_id: orderId },
      { take: 1 }
    )
    return results?.[0] || null
  }

  async getContactByCustomerId(customerId: string): Promise<any | null> {
    const results = await this.listLexwareContacts(
      { customer_id: customerId },
      { take: 1 }
    )
    return results?.[0] || null
  }

  // ─── Credit Notes / Gutschriften ───

  async issueCreditNote(
    orderId: string,
    logger: any,
    items?: { name: string; quantity: number; grossAmount: number; taxRatePercentage: number }[]
  ): Promise<{ creditNoteId: string; voucherNumber: string | null; pdfBuffer: Buffer | null }> {
    // 1. Original-Rechnung finden
    const invoiceRecord = await this.getInvoiceByOrderId(orderId)
    if (!invoiceRecord?.lexware_invoice_id) {
      throw new Error(`Keine Lexware-Rechnung fuer Order ${orderId} gefunden`)
    }

    // 2. Rechnungsdetails aus Lexware laden
    const client = await this.getClient(logger)
    const originalInvoice = await client.getInvoice(invoiceRecord.lexware_invoice_id) as any

    if (!originalInvoice?.address?.contactId) {
      throw new Error(`Original-Rechnung ${invoiceRecord.lexware_invoice_id} hat keinen Kontakt`)
    }

    // 3. Positionen bestimmen
    let creditLineItems: any[]
    if (items && items.length > 0) {
      // Teilerstattung: nur ausgewaehlte Positionen
      creditLineItems = items.map((item) => ({
        type: "custom" as const,
        name: item.name,
        quantity: item.quantity,
        unitName: "Stueck",
        unitPrice: {
          currency: originalInvoice.totalPrice?.currency || "EUR",
          grossAmount: item.grossAmount,
          taxRatePercentage: item.taxRatePercentage,
        },
      }))
    } else {
      // Volle Stornierung: alle Positionen der Original-Rechnung uebernehmen
      creditLineItems = (originalInvoice.lineItems || []).map((li: any) => ({
        type: "custom" as const,
        name: li.name,
        description: li.description,
        quantity: li.quantity,
        unitName: li.unitName || "Stueck",
        unitPrice: {
          currency: li.unitPrice?.currency || "EUR",
          grossAmount: li.unitPrice?.grossAmount || li.unitPrice?.netAmount || 0,
          taxRatePercentage: li.unitPrice?.taxRatePercentage ?? 19,
        },
      }))
    }

    if (creditLineItems.length === 0) {
      throw new Error("Keine Positionen fuer Gutschrift")
    }

    // 4. Credit Note Payload
    const settings = await this.getSettings()
    const isDryRun = settings.dry_run

    const voucherNumberRef = invoiceRecord.lexware_voucher_number
      ? ` (Rechnung ${invoiceRecord.lexware_voucher_number})`
      : ""

    const payload: CreateCreditNotePayload = {
      voucherDate: new Date().toISOString(),
      address: { contactId: originalInvoice.address.contactId },
      lineItems: creditLineItems,
      totalPrice: { currency: originalInvoice.totalPrice?.currency || "EUR" },
      taxConditions: { taxType: "gross" },
      introduction: `Gutschrift zu Bestellung${voucherNumberRef}`,
      remark: items ? "Teilerstattung" : "Stornierung",
      precedingSalesVoucherId: invoiceRecord.lexware_invoice_id,
    }

    // 5. Credit Note erstellen
    const creditNote = await client.createCreditNote(payload, !isDryRun)

    logger.info(
      `[lexware] ${isDryRun ? "DRY RUN: " : ""}Gutschrift erstellt: ${creditNote.id} (${creditNote.voucherNumber || "Entwurf"}) fuer Order ${orderId}`
    )

    // 6. In DB speichern
    await this.createLexwareCreditNotes({
      order_id: orderId,
      linked_invoice_id: invoiceRecord.lexware_invoice_id,
      lexware_credit_note_id: creditNote.id,
      lexware_voucher_number: creditNote.voucherNumber || null,
      status: isDryRun ? "draft" : "created",
    })

    // 7. PDF herunterladen (nur wenn finalisiert)
    let pdfBuffer: Buffer | null = null
    if (!isDryRun) {
      try {
        pdfBuffer = await client.downloadCreditNotePdf(creditNote.id)
      } catch (pdfErr) {
        logger.error(`[lexware] Gutschrift-PDF Download fehlgeschlagen: ${pdfErr}`)
      }
    }

    return {
      creditNoteId: creditNote.id,
      voucherNumber: creditNote.voucherNumber || null,
      pdfBuffer,
    }
  }

  async listCreditNotes(orderId?: string): Promise<any[]> {
    const filters = orderId ? { order_id: orderId } : {}
    return this.listLexwareCreditNotes(filters, { take: 100, order: { created_at: "DESC" } })
  }

  async downloadCreditNotePdf(
    data: { lexware_credit_note_id: string },
    logger: any
  ): Promise<{ pdf: Buffer }> {
    const client = await this.getClient(logger)
    const pdf = await client.downloadCreditNotePdf(data.lexware_credit_note_id)
    return { pdf }
  }

  async downloadInvoicePdf(
    data: { lexware_invoice_id: string },
    logger: any
  ): Promise<{ pdf: Buffer }> {
    const client = await this.getClient(logger)

    try {
      const pdf = await client.downloadInvoicePdf(data.lexware_invoice_id)
      logger.info(`[lexware] PDF für ${data.lexware_invoice_id} heruntergeladen`)
      return { pdf }
    } catch (e: any) {
      logger.error(`[lexware] Fehler beim PDF-Download für ${data.lexware_invoice_id}: ${e.message}`)
      throw e
    }
  }

  private async buildTaxRateMap(
    productIds: string[],
    container: any
  ): Promise<Map<string, number>> {
    const taxRateMap = new Map<string, number>()

    if (!productIds.length) return taxRateMap

    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)

      // Get all tax rate rules for these products
      const { data: taxRateRules } = await query.graph({
        entity: "tax_rate_rule",
        fields: ["reference_id", "tax_rate.rate"],
        filters: {
          reference: "product",
          reference_id: productIds,
        },
      })

      for (const rule of taxRateRules || []) {
        if (rule.reference_id && rule.tax_rate?.rate != null) {
          taxRateMap.set(rule.reference_id, rule.tax_rate.rate)
        }
      }
    } catch (err) {
      const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
      logger.warn(`lexware: Could not fetch tax rates, defaulting to 19%: ${err}`)
    }

    // Products not in the map get the default 19%
    return taxRateMap
  }

  // --- Webhook Management ---

  async setupWebhook(logger: any): Promise<{ subscriptionId: string }> {
    const settings = await this.getSettings()
    if (settings.webhook_subscription_id) {
      logger.info(`[lexware] Webhook bereits eingerichtet: ${settings.webhook_subscription_id}`)
      return { subscriptionId: settings.webhook_subscription_id }
    }

    const medusaDomain = process.env.MEDUSA_DOMAIN
    if (!medusaDomain) {
      throw new Error("MEDUSA_DOMAIN Umgebungsvariable nicht gesetzt")
    }

    const client = await this.getClient(logger)

    // Organization-ID holen und mitspeichern für Webhook-Validierung
    const profile = await client.getProfile()
    // MEDUSA_DOMAIN kann mit oder ohne Protokoll gesetzt sein
    const domain = medusaDomain.replace(/^https?:\/\//, "")
    const callbackUrl = `https://${domain}/webhooks/lexware/invoice-status`

    const result = await client.createEventSubscription(
      "invoice.status.changed",
      callbackUrl
    )

    // Subscription-ID + Organization-ID speichern
    const results = await this.listLexwareSettings({}, { take: 1 })
    const existing = results?.[0]
    if (existing) {
      await this.updateLexwareSettings({
        id: existing.id,
        webhook_subscription_id: result.subscriptionId,
        webhook_organization_id: profile.organizationId,
      } as any)
    }

    logger.info(`[lexware] Webhook eingerichtet: ${result.subscriptionId} → ${callbackUrl} (Org: ${profile.organizationId})`)
    return { subscriptionId: result.subscriptionId }
  }

  async removeWebhook(logger: any): Promise<void> {
    const settings = await this.getSettings()
    if (!settings.webhook_subscription_id) {
      logger.info("[lexware] Kein Webhook eingerichtet")
      return
    }

    const client = await this.getClient(logger)

    try {
      await client.deleteEventSubscription(settings.webhook_subscription_id)
      logger.info(`[lexware] Webhook entfernt: ${settings.webhook_subscription_id}`)
    } catch (e: any) {
      logger.warn(`[lexware] Webhook konnte bei Lexware nicht entfernt werden: ${e.message}`)
    }

    // Aus DB entfernen
    const results = await this.listLexwareSettings({}, { take: 1 })
    const existing = results?.[0]
    if (existing) {
      await this.updateLexwareSettings({
        id: existing.id,
        webhook_subscription_id: null,
        webhook_organization_id: null,
      } as any)
    }
  }

  async handleInvoiceStatusWebhook(
    payload: {
      organizationId: string
      eventType: string
      resourceId: string
      eventDate: string
    },
    logger: any
  ): Promise<void> {
    const { resourceId, organizationId } = payload

    // Organization prüfen (lokal gegen gespeicherte ID, kein API Call)
    const results = await this.listLexwareSettings({}, { take: 1 })
    const settings = results?.[0] as any
    const expectedOrgId = settings?.webhook_organization_id
    if (expectedOrgId && organizationId && expectedOrgId !== organizationId) {
      logger.warn(`[lexware] Webhook organizationId mismatch: erwartet ${expectedOrgId}, erhalten ${organizationId}`)
      return
    }

    // Invoice in lokaler DB suchen
    const invoices = await this.listLexwareInvoices(
      { lexware_invoice_id: resourceId },
      { take: 1 }
    )

    if (!invoices || invoices.length === 0) {
      logger.info(`[lexware] Webhook für unbekannte Rechnung ${resourceId}, ignoriere`)
      return
    }

    const invoice = invoices[0] as any

    // Aktuellen Status von Lexware abrufen
    try {
      const client = await this.getClient(logger)
      const lexwareInvoice = await client.getInvoice(resourceId)

      const paymentStatus = lexwareInvoice.paymentStatus || lexwareInvoice.voucherStatus || "open"

      await this.updateLexwareInvoices({
        id: invoice.id,
        payment_status: paymentStatus,
        payment_status_updated_at: new Date(),
      } as any)

      logger.info(`[lexware] Zahlungsstatus für Order ${invoice.order_id} aktualisiert: ${paymentStatus}`)
    } catch (e: any) {
      logger.error(`[lexware] Fehler beim Abrufen des Rechnungsstatus für ${resourceId}: ${e.message}`)
    }
  }

  private async sendErrorNotification(
    displayId: string | number,
    orderId: string,
    errorMessage: string,
    logger: any
  ): Promise<void> {
    const settings = await this.getSettings()
    const notificationEmail = settings.notification_email
    if (!notificationEmail) return

    try {
      const transporter = await this.buildMailTransporter()
      if (!transporter) {
        logger.warn("lexware: SMTP nicht konfiguriert, Fehler-E-Mail kann nicht gesendet werden")
        return
      }
      await transporter.sendMail({
        from: `"LexBridge" <${settings.smtp_user}>`,
        to: notificationEmail,
        subject: `Lexware Fehler: Rechnung fuer Bestellung #${displayId} fehlgeschlagen`,
        text: `Die automatische Rechnungserstellung in Lexware ist fehlgeschlagen.\n\nBestellung: #${displayId}\nOrder ID: ${orderId}\nFehler: ${errorMessage}\n\nBitte pruefen Sie die Bestellung im Admin-Bereich und erstellen Sie die Rechnung ggf. manuell.`,
      })
      logger.info(`lexware: Error notification sent to ${notificationEmail}`)
    } catch (mailErr) {
      logger.error(`lexware: Failed to send error notification: ${mailErr}`)
    }
  }

  async sendTestEmail(logger: any): Promise<{ success: boolean; message: string }> {
    const settings = await this.getSettings()
    if (!settings.notification_email) {
      return { success: false, message: "Keine Benachrichtigungs-E-Mail konfiguriert" }
    }
    const transporter = await this.buildMailTransporter()
    if (!transporter) {
      return { success: false, message: "SMTP nicht konfiguriert" }
    }
    try {
      await transporter.sendMail({
        from: `"LexBridge" <${settings.smtp_user}>`,
        to: settings.notification_email,
        subject: "LexBridge - Test-E-Mail",
        text: "Diese E-Mail bestaetigt, dass die SMTP-Konfiguration im LexBridge korrekt funktioniert.",
      })
      return { success: true, message: `Test-E-Mail an ${settings.notification_email} gesendet` }
    } catch (err: any) {
      return { success: false, message: `SMTP-Fehler: ${err.message}` }
    }
  }
}

export default LexwareModuleService
