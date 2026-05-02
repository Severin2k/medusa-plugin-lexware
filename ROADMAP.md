# medusa-plugin-lexware - Roadmap

## v0.9 → v1.0 (aktuell)

### Funktional
- [x] Idempotenz-Pruefung - doppelte Rechnungen bei wiederholten Events verhindern
- [x] Gastbestellungen - Lexware Kontakt-ID im `metadata`-Feld der Order speichern
- [x] 503 Retry-Logik (3 Versuche, Exponential Backoff, Fehler landet in DB)

### Admin UI - Free
- [x] API Key eingeben und speichern
- [x] "Verbindung testen" Button
- [x] Ein/Aus-Schalter fuer `invoice_on_order`
- [x] Zahlungsziel in Tagen einstellen (globaler Standard-Wert)
- [x] Rechnungsliste - Tabelle mit `order_id`, `status`, `error_message`, `retry_count`, Zahlungsstatus
- [x] API Key Countdown - gelbes Banner unter 30 Tage, rotes Banner bei abgelaufenem Key
- [x] Hinweistext zum Ablaufdatum
- [x] Zahlungsbedingungen pro Zahlungsmethode:
  - Plugin scannt installierte Zahlungsmethoden via `GET /admin/payment-providers`
  - Gespeicherte Einstellungen bleiben erhalten, neue Methoden erscheinen automatisch
  - Pro Methode 4 Optionen: Sofort faellig / Tag der Lieferung / 1-14 Tage / Standard Zahlungsziel
  - Stripe buendelt Kreditkarte, Apple Pay und Google Pay unter `pp_stripe_stripe`

### Admin UI - Pro
- [x] Fehler-Log - separates Fenster fuer Systemfehler ohne Order-Zuordnung
- [x] Dry-Run Modus ein/aus (Rechnungen als Entwurf statt finalisiert)
- [x] Webhook-Synchronisation Zahlungsstatus (Rechnungsliste + Admin UI Badge)
- [ ] E-Rechnung Support (Vorschau)
- [x] E-Mail-Versand bei Fehler (SMTP) - `sendErrorNotification()`
- [x] SMTP-Zugangsdaten in Plugin-Einstellungen (verschluesselt, Admin UI)
- [x] Admin-E-Mail-Adresse in Plugin-Settings (Admin UI)
- [x] Test-E-Mail senden Button in Admin UI
- [x] Automatische Warn-E-Mail 30 Tage vor API-Key-Ablauf (taeglich 08:00)

### API Key
- [x] `api_key_created_at` beim Speichern des Keys setzen

### Monitoring & Betrieb
- [ ] Queue wenn Lexware laengere Zeit nicht erreichbar
- [ ] `status.lexware.de` in README verlinken

### Dokumentation
- [ ] README: Anleitung API Key erstellen
- [ ] README: Abschnitt "Bekannte Einschraenkungen"
- [ ] GitHub Issue: Stornierungen / Gutschriften

---

## v1.0 - Zusaetzlich gebaut (nicht in Original-Roadmap)

### VIP/Abo-Shop Integration
- [x] Draft-Rechnungen - `upsertDraftInvoice()` fuer Monatsrechnungen
- [x] Draft finalisieren - `finalizeInvoice()` am Monatsende
- [x] Draft-Adress-Sync - `syncDraftInvoiceAddress()` nach Adressaenderung
- [x] Multi-Rechnungsadresse - `registerContactForBilling()` fuer VIP-Kunden

### Kontakt-Management
- [x] Kontakt-Sync - `syncContactBillingAddress()` + `syncContactCustomerInfo()` (Firma, Telefon, USt-IdNr)
- [x] Domain-Company-Mapping - automatisches Lernen neuer Mitarbeiter bei bekannten Firmen

### Rechnungserstellung
- [x] MwSt pro Produkt - `buildTaxRateMap()` (7%/19% je nach Produkttyp, Sonderregel manuelle Auftraege)
- [x] PDF an Bestaetigungsmail - synchroner Call, PDF direkt angehaengt (eine Mail statt zwei)
- [x] Mahnungen - `issueDunning()` via Lexware API

### Resilience
- [x] 429 Rate Limiting - 5 Versuche mit Backoff (1s bis 16s), 1s Mindestabstand zwischen Calls
- [x] Test-Retry Route - `/admin/lexware/test-retry`

---

## v1.1 - Pro

- [x] Stornierungen und Gutschriften (Credit Notes API, voll/teil, Dry-Run)
- [x] Lexware Webhook - Zahlungsstatus zurueck nach Medusa (schon in v1.0 erledigt)
- [x] E-Mail-Versand ueber Plugin-eigene SMTP-Konfiguration

---

## v2.0

- [ ] E-Rechnung / ZUGFeRD Support
