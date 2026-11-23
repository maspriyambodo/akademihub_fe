import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../utils/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { apiService } from '../../../utils/api'
import { wahaService } from './wahaService'

describe('wahaService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the default Saung WA connection without an appkey query', async () => {
    apiService.get.mockResolvedValueOnce({
      data: { data: { status: 'CONNECTED', connected: true } },
    })

    const response = await wahaService.checkConnection()

    expect(apiService.get).toHaveBeenCalledWith('/whatsapp/connection', { params: {} })
    expect(response.payload).toEqual({ status: 'CONNECTED', connected: true })
  })

  it('checks a selected Saung WA device by appkey', async () => {
    apiService.get.mockResolvedValueOnce({ data: { data: {} } })

    await wahaService.checkConnection('device-app-key')

    expect(apiService.get).toHaveBeenCalledWith('/whatsapp/connection', {
      params: { appkey: 'device-app-key' },
    })
  })

  it('previews recipients from selected master-data sources', async () => {
    apiService.post.mockResolvedValueOnce({ data: { data: { total: 12 } } })

    const response = await wahaService.previewBroadcast({ sources: ['siswa', 'wali'] })

    expect(apiService.post).toHaveBeenCalledWith('/whatsapp/broadcast/preview', {
      sources: ['siswa', 'wali'],
    })
    expect(response.payload).toEqual({ total: 12 })
  })

  it('queues and reads a WhatsApp broadcast', async () => {
    apiService.post.mockResolvedValueOnce({ data: { data: { id: 'broadcast-id' } } })
    apiService.get.mockResolvedValueOnce({ data: { data: { status: 'processing' } } })

    await wahaService.sendBroadcast({ sources: ['guru'], message: 'Halo', confirmed: true })
    const status = await wahaService.getBroadcastStatus('broadcast-id')

    expect(apiService.post).toHaveBeenCalledWith('/whatsapp/broadcast', {
      sources: ['guru'],
      message: 'Halo',
      confirmed: true,
    })
    expect(apiService.get).toHaveBeenCalledWith('/whatsapp/broadcast/broadcast-id')
    expect(status.payload).toEqual({ status: 'processing' })
  })
})
