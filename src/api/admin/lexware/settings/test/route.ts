import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { api_key } = req.body as { api_key: string }

  if (!api_key) {
    res.status(400).json({ message: "API Key ist erforderlich" })
    return
  }

  try {
    const response = await fetch("https://api.lexoffice.io/v1/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${api_key}`,
        Accept: "application/json",
      },
    })

    if (response.ok) {
      res.json({ success: true })
      return
    }

    if (response.status === 401 || response.status === 403) {
      res
        .status(401)
        .json({ message: "API Key ungültig oder abgelaufen" })
      return
    }

    res
      .status(502)
      .json({ message: `Lexware nicht erreichbar (HTTP ${response.status})` })
  } catch (err: any) {
    res
      .status(502)
      .json({ message: "Lexware nicht erreichbar: " + (err.message || err) })
  }
}
