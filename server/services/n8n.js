import { config } from '../config.js'

/**
 * n8n Service Helper for interacting with n8n REST API and Webhooks
 */
export class N8nService {
  /**
   * Helper to make authenticated requests to n8n Public API
   */
  static async request(endpoint, options = {}) {
    const baseUrl = config.n8n.apiUrl.replace(/\/$/, '')
    const url = `${baseUrl}/api/v1${endpoint}`
    
    const headers = {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': config.n8n.apiKey,
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`n8n API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  /**
   * List all workflows in n8n
   */
  static async getWorkflows() {
    const result = await this.request('/workflows')
    return result.data || []
  }

  /**
   * Get details of a specific workflow
   */
  static async getWorkflow(id) {
    return this.request(`/workflows/${id}`)
  }

  /**
   * Activate or deactivate a workflow
   */
  static async setWorkflowActive(id, active = true) {
    const action = active ? 'activate' : 'deactivate'
    return this.request(`/workflows/${id}/${action}`, { method: 'POST' })
  }

  /**
   * Trigger a webhook endpoint in n8n
   * @param {string} path Webhook path or full URL
   * @param {object} payload Data to send
   */
  static async triggerWebhook(path, payload = {}) {
    const url = path.startsWith('http') ? path : `${config.n8n.apiUrl.replace(/\/$/, '')}/webhook/${path.replace(/^\//, '')}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`n8n Webhook error (${response.status}): ${errorText}`)
    }

    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      return { text }
    }
  }
}
