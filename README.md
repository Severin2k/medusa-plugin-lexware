# LexBridge

Lexware Office Rechnungsintegration fuer Medusa v2. Erstellt automatisch Rechnungen in Lexware Office bei Bestellungen, verwaltet Kontakte, haengt Rechnungs-PDFs an Bestaetigungsmails an und synchronisiert Zahlungsstatus per Webhook.

## Free vs. Pro

LexBridge gibt es in zwei Versionen:

### Free - kostenlos

- **Automatische Rechnungserstellung** - Rechnung bei jeder Bestellung automatisch in Lexware anlegen und finalisieren
- **Kontaktverwaltung** - Kunden automatisch in Lexware suchen oder anlegen (auch Gastbestellungen)
- **PDF-Versand** - Rechnungs-PDF herunterladen und an Bestaetigungsmail anhaengen
- **Zahlungsbedingungen pro Zahlungsmethode** - Sofort faellig, X Tage, Lieferdatum - individuell pro Provider
- **Admin UI** - API Key Management, Rechnungsliste, Zahlungsbedingungen, Verbindungstest
- **API Key Countdown** - Ablauf-Warnung in der Admin UI (gruen/orange/rot)
- **Retry bei Fehlern** - Fehlgeschlagene Rechnungen erneut versuchen
- **Verschluesselung** - API Key wird mit AES-256-GCM in der Datenbank gespeichert
- **Rate Limiting** - Automatische Drosselung mit Exponential Backoff bei 429/503 Fehlern

### Pro - 9,99 EUR/Monat oder 99,99 EUR/Jahr

Alle Free-Features plus:

- **Gutschriften/Stornierungen** - Volle oder teilweise Erstattung per Credit Note, verknuepft mit Original-Rechnung
- **Testmodus (Dry Run)** - Rechnungen als Entwurf anlegen ohne zu finalisieren
- **Webhook** - Zahlungsstatus-Aenderungen aus Lexware werden automatisch synchronisiert
- **E-Mail-Benachrichtigungen** - SMTP-Konfiguration in der Admin UI, Fehler-Mails bei fehlgeschlagenen Rechnungen
- **Warn-E-Mail vor API-Key-Ablauf** - Taeglich 30 Tage vor Ablauf automatisch per E-Mail erinnert
- **Tax Rate Override** - MwSt pro Position per Callback ueberschreiben

Pro wird ueber einen License Key in den Plugin-Optionen freigeschaltet. Ohne Key laufen alle Free-Features ohne Einschraenkung.

## Voraussetzungen

- Medusa v2 (>= 2.10.0)
- Node.js >= 20
- Lexware Office Account mit API-Zugang

## Installation

```bash
npm install medusa-lexbridge
```

## Einrichtung

### 1. Umgebungsvariable

Eine einzige Umgebungsvariable wird benoetigt - der Schluessel zur Verschluesselung der API-Zugangsdaten in der Datenbank:

```env
# 32 Bytes als Hex-String generieren:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
LEXWARE_ENCRYPTION_KEY=dein_64_zeichen_hex_string
```

Alle anderen Einstellungen (API Key, SMTP, Benachrichtigungs-E-Mail) werden ueber die Admin UI konfiguriert.

### 2. Medusa Konfiguration

Plugin in `medusa-config.ts` hinzufuegen:

```typescript
import { LEXWARE_MODULE } from "medusa-lexbridge"

export default defineConfig({
  // ...
  modules: [
    {
      resolve: "medusa-lexbridge",
      key: LEXWARE_MODULE,
      options: {
        invoice_on_order: true,   // Rechnung automatisch bei Bestellung erstellen
        payment_term_days: 14,    // Standard-Zahlungsziel in Tagen
        // license_key: "LB-...", // Pro-Features freischalten (optional)
      },
    },
  ],
})
```

### 3. Migrationen ausfuehren

```bash
npx medusa db:migrate
```

### 4. API Key eintragen

1. In Lexware Office einen API Key erstellen: Einstellungen -> Oeffentliche API -> Schluessel erstellen
2. Im Medusa Admin unter **Lexware** den Key eintragen
3. "Verbindung testen" klicken

## Konfigurationsoptionen

| Option | Typ | Standard | Beschreibung |
|--------|-----|----------|-------------|
| `invoice_on_order` | `boolean` | `true` | Rechnung automatisch bei `order.placed` erstellen |
| `payment_term_days` | `number` | `14` | Standard-Zahlungsziel in Tagen (0 = sofort faellig) |
| `license_key` | `string` | - | License Key fuer Pro-Features (optional) |

## Admin UI

Die komplette Konfiguration erfolgt ueber die Admin-Oberflaeche unter **LexBridge**:

### API-Verbindung
- API Key eingeben, aendern und testen
- Ablauf-Countdown (Lexware Keys laufen nach 24 Monaten ab)
- Webhook fuer Zahlungsstatus einrichten/entfernen

### Rechnungseinstellungen
- Automatische Rechnungserstellung ein/aus
- Testmodus (Dry Run) - Rechnungen als Entwurf statt finalisiert
- Standard-Zahlungsziel in Tagen

### Zahlungsbedingungen
Pro installierter Zahlungsmethode (Stripe, PayPal, Bar, EC, SEPA etc.) konfigurierbar:
- **Sofort faellig** - 0 Tage
- **Tag der Lieferung/Abholung** - Berechnet aus Order-Metadata
- **X Tage** - 1-14 Tage konfigurierbar
- **Standard** - Uebernimmt das globale Zahlungsziel

Stripe buendelt Kreditkarte, Apple Pay und Google Pay unter einem Provider - keine separate Konfiguration noetig.

### E-Mail-Benachrichtigungen
- Empfaenger-Adresse fuer Fehler-Mails
- SMTP-Konfiguration (Host, Port, Benutzer, Passwort, SSL)
- Test-E-Mail senden
- Automatische Warnung 30 Tage vor API-Key-Ablauf (taeglich um 08:00)

### Rechnungsliste
- Uebersicht aller erstellten Rechnungen mit Status, Rechnungsnummer, Zahlungsstatus
- Retry-Button bei fehlgeschlagenen Rechnungen
- Gutschrift-Button pro Rechnung (Komplett-Stornierung oder Teilerstattung)

## Wie es funktioniert

### Rechnungserstellung

Bei jeder Bestellung (`order.placed`):

1. **Kontakt suchen/anlegen** - Kunde wird per E-Mail in Lexware gesucht, bei Bedarf neu angelegt
2. **Rechnung erstellen** - Positionen mit korrekten MwSt-Saetzen, Zahlungsziel pro Zahlungsmethode
3. **PDF herunterladen** - Finalisierte Rechnung als PDF von der Lexware API
4. **Referenz speichern** - Lexware Rechnungs-ID und Rechnungsnummer in der Datenbank

Das PDF kann im `order.placed` Subscriber an die Bestaetigungsmail angehaengt werden:

```typescript
const lexwareService = container.resolve("lexware") as any
const result = await lexwareService.processOrderInvoice(orderId, container)
if (result?.pdfBuffer) {
  // PDF an E-Mail anhaengen
}
```

### Gutschriften

Gutschriften werden ueber den Lexware `/v1/credit-notes` Endpoint erstellt und mit der Original-Rechnung verknuepft. Lexware reduziert das offene Saldo automatisch.

- **Komplett-Stornierung** - Alle Positionen der Original-Rechnung werden uebernommen
- **Teilerstattung** - Eigene Positionen mit Bezeichnung, Menge, Betrag und MwSt-Satz

### Testmodus (Dry Run)

Im Testmodus werden Rechnungen als Entwurf in Lexware angelegt (nicht finalisiert). So kann geprueft werden ob Positionen, MwSt und Kontaktdaten korrekt sind, ohne echte Rechnungsnummern zu verbrauchen. Entwuerfe koennen in Lexware Office manuell geloescht werden.

### Idempotenz

Jede Order kann nur eine Rechnung haben (Unique Constraint auf `order_id`). Bei gleichzeitigen Events wird nur die erste Rechnung erstellt, weitere Aufrufe werden ignoriert.

### Tax Rate Override

Die MwSt pro Position kann per Callback ueberschrieben werden:

```typescript
await lexwareService.processOrderInvoice(orderId, container, false, {
  taxRateOverride: (order, item, defaultRate) => {
    // Eigene Logik, z.B. reduzierter Satz fuer bestimmte Produkte
    return defaultRate
  },
})
```

## Admin API

Alle Endpoints erfordern Admin-Authentifizierung.

### Einstellungen

```
GET  /admin/lexware/settings          - Einstellungen abrufen
POST /admin/lexware/settings          - Einstellungen speichern
POST /admin/lexware/settings/test     - API-Verbindung testen
POST /admin/lexware/settings/test-email - Test-E-Mail senden
```

### Rechnungen

```
GET  /admin/lexware/invoices              - Liste aller Rechnungen
GET  /admin/lexware/invoices/:orderId     - Rechnung fuer eine Bestellung
POST /admin/lexware/invoices/:orderId     - Rechnungserstellung erneut versuchen
GET  /admin/lexware/invoices/:orderId/pdf - Rechnungs-PDF herunterladen
```

### Gutschriften

```
GET  /admin/lexware/credit-notes          - Liste aller Gutschriften
POST /admin/lexware/credit-notes          - Gutschrift erstellen
GET  /admin/lexware/credit-notes/:id/pdf  - Gutschrift-PDF herunterladen
```

Gutschrift erstellen:
```json
{
  "order_id": "order_01ABC...",
  "items": [
    {
      "name": "Artikelname",
      "quantity": 1,
      "grossAmount": 35.00,
      "taxRatePercentage": 19
    }
  ]
}
```

`items` weglassen = komplette Stornierung aller Positionen.

### Kontakte

```
GET /admin/lexware/contacts/:customerId - Lexware-Kontakt fuer einen Kunden
```

### Webhook

```
POST   /admin/lexware/webhook - Webhook einrichten
DELETE /admin/lexware/webhook - Webhook entfernen
```

Webhook-Endpoint fuer Lexware (kein Admin-Auth):
```
POST /webhooks/lexware/invoice-status
```

## Fehlerbehandlung

- **Rate Limiting** - Mindestens 1 Sekunde zwischen Lexware API Calls
- **429 Too Many Requests** - Exponential Backoff (1s, 2s, 4s, 8s, 16s - max 5 Versuche)
- **503 Service Unavailable** - 3 Versuche mit Backoff (2s, 4s)
- **Fehler-Status** - Fehlgeschlagene Rechnungen werden mit Fehlermeldung in der DB gespeichert
- **E-Mail-Benachrichtigung** - Bei persistenten Fehlern wird eine E-Mail an die konfigurierte Adresse gesendet
- **Retry** - Fehlgeschlagene Rechnungen koennen ueber die Admin UI oder API erneut versucht werden

## Datenbank-Tabellen

Das Plugin erstellt drei Tabellen:

| Tabelle | Beschreibung |
|---------|-------------|
| `lexware_settings` | API Key (verschluesselt), SMTP (verschluesselt), Zahlungsbedingungen, Webhook-ID |
| `lexware_invoice` | Rechnung pro Bestellung mit Lexware-ID, Rechnungsnummer, Status, Zahlungsstatus |
| `lexware_contact` | Zuordnung Medusa Customer -> Lexware Kontakt-ID |
| `lexware_credit_note` | Gutschriften mit Verknuepfung zur Original-Rechnung |

## Lexware Office API Key erstellen

1. In Lexware Office einloggen
2. Einstellungen -> Oeffentliche API
3. "Schluessel erstellen" klicken
4. Den generierten Key kopieren
5. Im Medusa Admin unter Lexware eintragen

Der Key ist 24 Monate gueltig. Das Plugin zeigt einen Countdown in der Admin UI und sendet 30 Tage vor Ablauf taeglich eine Warn-E-Mail.

## Bekannte Einschraenkungen

- **Lexware API Rate Limit** - Maximal 2 Anfragen pro Sekunde. Das Plugin drosselt automatisch, aber bei vielen gleichzeitigen Bestellungen kann es zu Verzoegerungen kommen.
- **Keine Rechnungs-Aktualisierung** - Finalisierte Rechnungen koennen in Lexware nicht geaendert oder geloescht werden. Korrekturen erfolgen per Gutschrift.
- **PDF nur nach Finalisierung** - Im Testmodus (Dry Run) wird kein PDF erzeugt, da Lexware nur fuer finalisierte Rechnungen PDFs bereitstellt.
- **Ein Key pro Shop** - Lexware Office erlaubt pro Account nur einen aktiven API Key.
