export async function sendWhatsAppMessage(to: string, body: string) {
  const token = process.env.WHATSAPP_TOKEN!
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!

  const response = await fetch(
    `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body }
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Erro ao enviar WhatsApp: ${error}`)
  }

  return response.json()
}
