import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  LoaderCircle,
  Megaphone,
  RefreshCw,
  Send,
  UserRoundCheck,
  Users,
  XCircle,
} from 'lucide-react'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import PermissionGuard from '../../../components/guards/PermissionGuard'
import { showConfirm, showError, showSuccess } from '../../../utils/sweetalert'
import { wahaService } from '../services/wahaService'

const RECIPIENT_SOURCES = [
  {
    value: 'siswa',
    label: 'Siswa',
    description: 'Nomor HP siswa aktif',
    icon: GraduationCap,
  },
  {
    value: 'wali',
    label: 'Wali Murid',
    description: 'Nomor HP orang tua / wali',
    icon: Users,
  },
  {
    value: 'guru',
    label: 'Guru',
    description: 'Nomor HP master guru',
    icon: UserRoundCheck,
  },
]

const SOURCE_LABELS = Object.fromEntries(RECIPIENT_SOURCES.map((item) => [item.value, item.label]))

const getErrorMessage = (response, fallback) => (
  response?.error?.message || response?.data?.message || fallback
)

const statusLabel = {
  queued: 'Menunggu antrean',
  processing: 'Sedang dikirim',
  completed: 'Selesai',
}

const SummaryBox = ({ label, value, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

const WahaBroadcastPage = () => {
  const [sources, setSources] = useState([])
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(null)
  const [broadcast, setBroadcast] = useState(null)
  const [activeBroadcastId, setActiveBroadcastId] = useState(null)
  const [loading, setLoading] = useState({ preview: false, send: false })

  const progress = useMemo(() => {
    if (!broadcast?.total_count) return 0
    return Math.min(100, Math.round(
      ((broadcast.sent_count + broadcast.failed_count) / broadcast.total_count) * 100,
    ))
  }, [broadcast])

  const toggleSource = (source) => {
    setSources((current) => (
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source]
    ))
    setPreview(null)
  }

  const insertVariable = (variable) => {
    setMessage((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}${variable}`)
  }

  const handlePreview = async () => {
    if (sources.length === 0) {
      showError('Pilih minimal satu sumber penerima.')
      return
    }

    setLoading((current) => ({ ...current, preview: true }))
    try {
      const response = await wahaService.previewBroadcast({ sources })
      if (response.error || !response.payload) {
        throw new Error(getErrorMessage(response, 'Gagal memuat preview penerima.'))
      }
      setPreview(response.payload)
    } catch (error) {
      showError(error.message || 'Gagal memuat preview penerima.')
    } finally {
      setLoading((current) => ({ ...current, preview: false }))
    }
  }

  const loadStatus = useCallback(async (id) => {
    const response = await wahaService.getBroadcastStatus(id)
    if (response.error || !response.payload) return

    setBroadcast(response.payload)
    if (response.payload.status === 'completed') {
      setActiveBroadcastId(null)
      showSuccess(
        `${response.payload.sent_count} pesan terkirim, ${response.payload.failed_count} gagal.`,
        'Broadcast selesai',
      )
    }
  }, [])

  useEffect(() => {
    if (!activeBroadcastId) return undefined

    loadStatus(activeBroadcastId)
    const timer = window.setInterval(() => loadStatus(activeBroadcastId), 2500)
    return () => window.clearInterval(timer)
  }, [activeBroadcastId, loadStatus])

  const handleSend = async () => {
    if (!preview || preview.total === 0) {
      showError('Jalankan preview penerima terlebih dahulu.')
      return
    }
    if (!message.trim()) {
      showError('Isi pesan broadcast terlebih dahulu.')
      return
    }
    if (preview.exceeds_limit) {
      showError(`Jumlah penerima melebihi batas ${preview.limit} nomor.`)
      return
    }

    const confirmation = await showConfirm(
      `Kirim pesan ke ${preview.total.toLocaleString('id-ID')} nomor unik? Pengiriman yang sudah berjalan tidak dapat dibatalkan.`,
      'Konfirmasi broadcast',
    )
    if (!confirmation.isConfirmed) return

    setLoading((current) => ({ ...current, send: true }))
    try {
      const response = await wahaService.sendBroadcast({
        sources,
        message: message.trim(),
        confirmed: true,
      })
      if (response.error || !response.payload?.id) {
        throw new Error(getErrorMessage(response, 'Gagal memasukkan broadcast ke antrean.'))
      }

      setBroadcast({
        ...response.payload,
        sent_count: 0,
        failed_count: 0,
      })
      setActiveBroadcastId(response.payload.id)
      showSuccess('Pesan sudah masuk antrean pengiriman.', 'Broadcast dimulai')
    } catch (error) {
      showError(error.message || 'Gagal mengirim broadcast.')
    } finally {
      setLoading((current) => ({ ...current, send: false }))
    }
  }

  return (
    <PermissionGuard permission="waha.send">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <Megaphone className="h-4 w-4" /> WhatsApp Broadcast
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Kirim pesan massal</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Ambil nomor dari master data, cek penerima valid, lalu kirim melalui antrean SaungWA.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <Card className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Langkah 1</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Pilih sumber penerima</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {RECIPIENT_SOURCES.map(({ value, label, description, icon: Icon }) => {
                const selected = sources.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSource(value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100 dark:bg-primary-900/20 dark:ring-primary-900/40'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Icon className={`h-5 w-5 ${selected ? 'text-primary-600' : 'text-slate-400'}`} />
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}>
                        {selected && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </span>
                    </div>
                    <p className="mt-4 font-semibold text-slate-900 dark:text-white">{label}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-6 dark:border-slate-700">
              <Button onClick={handlePreview} loading={loading.preview} disabled={sources.length === 0}>
                <RefreshCw className="mr-2 h-4 w-4" /> Preview penerima
              </Button>
              <p className="text-xs text-slate-500">Nomor otomatis dinormalisasi dan dideduplikasi.</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Langkah 2</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Tulis pesan</h2>
              <p className="mt-1 text-sm text-slate-500">Variabel akan diganti untuk setiap penerima.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {['{nama}', '{jenis_penerima}'].map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-600 hover:border-primary-400 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  + {variable}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="broadcast-message" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Isi pesan
              </label>
              <textarea
                id="broadcast-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={9}
                maxLength={4096}
                placeholder={'Contoh: Halo {nama}, kami informasikan kegiatan sekolah akan dilaksanakan besok.'}
                className="input-field min-h-[220px] resize-y"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>Mendukung format teks WhatsApp.</span>
                <span>{message.length}/4096</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleSend}
                loading={loading.send}
                disabled={!preview || preview.total === 0 || !message.trim() || Boolean(activeBroadcastId)}
              >
                <Send className="mr-2 h-5 w-5" /> Kirim broadcast
              </Button>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ringkasan penerima</h2>
              {!preview ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">Pilih sumber lalu jalankan preview.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <SummaryBox label="Valid" value={preview.total} tone="green" />
                    <SummaryBox label="Duplikat" value={preview.duplicate_count} tone="amber" />
                    <SummaryBox label="Tidak valid" value={preview.invalid_count} tone="slate" />
                  </div>

                  {preview.exceeds_limit && (
                    <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      Jumlah penerima melebihi batas {preview.limit} nomor per broadcast.
                    </div>
                  )}

                  <div className="space-y-2">
                    {Object.entries(preview.source_totals || {}).map(([source, total]) => (
                      <div key={source} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
                        <span className="text-slate-600 dark:text-slate-300">{SOURCE_LABELS[source]}</span>
                        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{total}</span>
                      </div>
                    ))}
                  </div>

                  {preview.sample?.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Contoh penerima</p>
                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                        {preview.sample.map((recipient, index) => (
                          <div key={`${recipient.phone}-${index}`} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-sm last:border-0 dark:border-slate-800">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-800 dark:text-slate-100">{recipient.name}</p>
                              <p className="text-xs text-slate-400">{SOURCE_LABELS[recipient.source]}</p>
                            </div>
                            <span className="font-mono text-xs text-slate-500">{recipient.phone}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {broadcast && (
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Status pengiriman</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                      {statusLabel[broadcast.status] || broadcast.status}
                    </h2>
                  </div>
                  {broadcast.status === 'completed'
                    ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    : <LoaderCircle className="h-6 w-6 animate-spin text-primary-500" />}
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>{progress}% selesai</span>
                  <span>{(broadcast.sent_count + broadcast.failed_count)}/{broadcast.total_count}</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <div><p className="text-xs">Terkirim</p><p className="font-bold tabular-nums">{broadcast.sent_count}</p></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                    <XCircle className="h-5 w-5" />
                    <div><p className="text-xs">Gagal</p><p className="font-bold tabular-nums">{broadcast.failed_count}</p></div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}

export default WahaBroadcastPage
