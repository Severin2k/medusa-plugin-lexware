import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Label, Input, Switch, Button, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

const LexwareSettingsPage = () => {
  const [apiKey, setApiKey] = useState("")
  const [hasApiKey, setHasApiKey] = useState(false)
  const [invoiceOnOrder, setInvoiceOnOrder] = useState(true)
  const [paymentDueDays, setPaymentDueDays] = useState(14)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message?: string
  } | null>(null)

  useEffect(() => {
    fetch("/admin/lexware/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setHasApiKey(data.has_api_key)
        setInvoiceOnOrder(data.invoice_on_order)
        setPaymentDueDays(data.payment_due_days)
      })
      .catch(() => toast.error("Einstellungen konnten nicht geladen werden"))
      .finally(() => setLoading(false))
  }, [])

  const handleTest = async () => {
    if (!apiKey) {
      setTestResult({
        success: false,
        message: "Bitte gib einen API Key ein",
      })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/admin/lexware/settings/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult({ success: true, message: "Verbindung erfolgreich!" })
      } else {
        setTestResult({ success: false, message: data.message })
      }
    } catch {
      setTestResult({
        success: false,
        message: "Netzwerkfehler beim Verbindungstest",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, any> = {
        invoice_on_order: invoiceOnOrder,
        payment_due_days: paymentDueDays,
      }
      if (apiKey) {
        body.api_key = apiKey
      }
      const res = await fetch("/admin/lexware/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success("Einstellungen gespeichert")
        if (apiKey) {
          setHasApiKey(true)
          setApiKey("")
        }
      } else {
        toast.error("Fehler beim Speichern")
      }
    } catch {
      toast.error("Netzwerkfehler beim Speichern")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Lade Einstellungen...</Text>
      </Container>
    )
  }

  return (
    <Container className="p-8">
      <div className="flex flex-col gap-y-8">
        <div>
          <Heading level="h1">Lexware Office</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            API-Verbindung und Rechnungseinstellungen
          </Text>
        </div>

        {/* API Key */}
        <div className="flex flex-col gap-y-4">
          <Heading level="h2">API-Verbindung</Heading>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="api_key">API Key</Label>
            <Input
              id="api_key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                hasApiKey
                  ? "API Key gespeichert — leer lassen um beizubehalten"
                  : "Lexware Office API Key eingeben"
              }
            />
          </div>

          <div className="flex items-center gap-x-3">
            <Button
              variant="secondary"
              onClick={handleTest}
              isLoading={testing}
              disabled={testing}
            >
              Verbindung testen
            </Button>
            {testResult && (
              <Text
                className={
                  testResult.success ? "text-ui-fg-interactive" : "text-ui-fg-error"
                }
              >
                {testResult.message}
              </Text>
            )}
          </div>
        </div>

        {/* Rechnungseinstellungen */}
        <div className="flex flex-col gap-y-4">
          <Heading level="h2">Rechnungseinstellungen</Heading>

          <div className="flex items-center gap-x-3">
            <Switch
              id="invoice_on_order"
              checked={invoiceOnOrder}
              onCheckedChange={setInvoiceOnOrder}
            />
            <Label htmlFor="invoice_on_order">
              Rechnung automatisch bei Bestellung erstellen
            </Label>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="payment_due_days">Zahlungsziel (Tage)</Label>
            <Input
              id="payment_due_days"
              type="number"
              min={0}
              max={90}
              value={paymentDueDays}
              onChange={(e) =>
                setPaymentDueDays(
                  Math.max(0, Math.min(90, parseInt(e.target.value) || 0))
                )
              }
            />
          </div>
        </div>

        {/* Speichern */}
        <div>
          <Button onClick={handleSave} isLoading={saving} disabled={saving}>
            Einstellungen speichern
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Lexware",
})

export default LexwareSettingsPage
