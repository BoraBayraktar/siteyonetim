# WhatsApp duyuru bildirimleri (FAZ 1)

## Kapsam

- Duyurular **WhatsApp Business Cloud API** ile **daire/kişi telefonuna** gider (`Party.phone` + `communicationConsent`).
- **WhatsApp grupları** desteklenmez; yalnızca onaylı **şablon** mesajları (utility/marketing politikasına uygun Meta şablonu gerekir).

## Veri modeli

- `OutboxChannel.WHATSAPP`
- `PropertyWhatsAppProfile`: apartman bazında `enabled`, `phoneNumberId`, `templateName` (varsayılan `siteyonetim_duyuru`), `templateLanguage` (varsayılan `tr`).

## Akış

1. Admin → Bildirimler → WhatsApp profilini etkinleştirir.
2. Duyuru → “Kuyruğa al” → kanal olarak WhatsApp seçilir.
3. `comm-notifications` outbox’a yazar; `processPending` sağlayıcıyı çağırır.

## Sağlayıcı

- `WHATSAPP_ACCESS_TOKEN` yoksa: konsol sağlayıcı (geliştirme).
- Varsa: Meta Graph API `v21.0/{phoneNumberId}/messages`, şablon gövdesinde iki metin parametresi: duyuru başlığı, duyuru metni.

## Meta şablon

Örnek şablon adı: `siteyonetim_duyuru`, dil: `tr`, gövde:

```
{{1}}

{{2}}
```

Parametre sırası kod ile uyumlu: 1 = başlık, 2 = metin.

## Ortam

Bkz. kök `.env.example`: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
