import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  School,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Award,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Compass,
  ArrowRight,
  LogIn,
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { ppdbPublicService } from '../../ppdb/services/ppdbService'
import { getTenantFromHostname } from '../../../utils/api'
import { getSubdomain } from '../../../utils/tenant'

export { getSubdomain }

const HARI_MAP = {
  MON: 'Senin',
  TUE: 'Selasa',
  WED: 'Rabu',
  THU: 'Kamis',
  FRI: 'Jumat',
  SAT: 'Sabtu',
  SUN: 'Minggu',
}

const PENDIDIKAN_MAP = {
  1: 'SD / Sederajat',
  2: 'SMP / Sederajat',
  3: 'SMA / Sederajat',
  4: 'Diploma (D3/D4)',
  5: 'Sarjana (S1)',
  6: 'Magister (S2)',
  7: 'Doktor (S3)',
}

const PublicProfile = () => {
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const currentIdentifier = searchParams.get('identifier') || searchParams.get('sekolah') || getSubdomain()

  const fetchProfileData = async (identifier) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: apiError } = await ppdbPublicService.getPublicProfile(identifier)
      if (apiError) {
        throw new Error(typeof apiError === 'string' ? apiError : (apiError.message || 'Gagal memuat profil sekolah'))
      }
      const payload = data?.data ?? data
      if (payload && (payload.id || payload.nama_sekolah)) {
        setProfile(payload)
      } else {
        throw new Error('Data profil tidak ditemukan')
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat memuat data profil')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfileData(currentIdentifier)
  }, [currentIdentifier])

  // ponytail: dynamic DOM head injection covers JS-aware bots (Googlebot/Bingbot); add edge prerender worker when non-JS scrapers (WhatsApp/FB) demand server-rendered OG tags.
  useEffect(() => {
    if (!profile?.nama_sekolah) return

    const prevTitle = document.title
    const title = `Profil Sekolah — ${profile.nama_sekolah}`
    document.title = title

    const desc = `${profile.nama_sekolah} — Profil resmi lembaga pendidikan. ${profile.alamat ? profile.alamat + '. ' : ''}Informasi akademik, PPDB online, dan profil tenaga pendidik.`
    const canonicalUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''

    const setMeta = (attr, key, content) => {
      if (!content) return
      let el = document.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('name', 'twitter:card', profile.logo_url ? 'summary_large_image' : 'summary')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', desc)

    if (profile.logo_url) {
      setMeta('property', 'og:image', profile.logo_url)
      setMeta('name', 'twitter:image', profile.logo_url)
    }

    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalUrl)

    const schemaId = 'school-jsonld'
    let script = document.getElementById(schemaId)
    if (!script) {
      script = document.createElement('script')
      script.id = schemaId
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'School',
      name: profile.nama_sekolah,
      description: desc,
      url: canonicalUrl,
      ...(profile.npsn ? { identifier: profile.npsn } : {}),
      ...(profile.logo_url ? { image: profile.logo_url } : {}),
      ...(profile.alamat ? {
        address: {
          '@type': 'PostalAddress',
          streetAddress: profile.alamat,
          addressCountry: 'ID',
        }
      } : {}),
    })

    return () => {
      document.title = prevTitle
      script?.remove()
    }
  }, [profile])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Memuat profil sekolah...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-800 p-8 text-center">
          <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={30} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Gagal Memuat Profil</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error || 'Profil sekolah tidak ditemukan.'}</p>
          <button
            onClick={() => fetchProfileData(currentIdentifier)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition"
          >
            <RefreshCw size={16} />
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  const { stats, settings, ppdb, jurusan = [], ekskul = [], guru = [] } = profile
  const ppdbActive = ppdb?.is_active && Array.isArray(ppdb?.gelombang) && ppdb.gelombang.length > 0
  const activeGelombang = ppdbActive ? ppdb.gelombang[0] : null
  const activeGelombangName = typeof activeGelombang?.nama_gelombang === 'string'
    ? activeGelombang.nama_gelombang.trim()
    : ''
  const ppdbLink = `/ppdb/portal${profile.identifier ? `?sekolah=${profile.identifier}` : ''}`
  const blogLink = `/blog${profile.identifier || currentIdentifier ? `?sekolah=${encodeURIComponent(profile.identifier || currentIdentifier)}` : ''}`

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-gray-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-200 selection:text-slate-950">
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt={profile.nama_sekolah} className="w-11 h-11 rounded-xl object-contain border border-slate-200 dark:border-gray-700 bg-white p-1" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-md font-bold shrink-0">
                <School size={22} />
              </div>
            )}
            <div className="truncate">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-950 dark:text-white truncate">{profile.nama_sekolah}</h1>
              {profile.npsn && <p className="text-[10px] sm:text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">NPSN {profile.npsn}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to={blogLink} className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-200 transition-colors">
              <BookOpen size={15} />
              <span>Berita & Artikel</span>
            </Link>
            <Link to={ppdbLink} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-slate-950 hover:bg-amber-400 hover:text-slate-950 dark:bg-white dark:text-slate-950 text-white shadow-sm transition-colors">
              <GraduationCap size={15} />
              <span>PPDB Online</span>
            </Link>
            <Link to="/login" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors">
              <LogIn size={15} />
              <span>Login</span>
            </Link>
          </div>
        </div>
      </header>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-[#0d2b24] text-white">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 18% 18%, rgba(251,191,36,.32), transparent 28%), radial-gradient(circle at 82% 12%, rgba(45,212,191,.2), transparent 24%)' }} />
        <div className="absolute -right-28 -bottom-40 w-[34rem] h-[34rem] rounded-full border-[80px] border-white/[0.035]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 relative z-10">
          <div className="grid lg:grid-cols-[1fr_320px] gap-10 lg:gap-16 items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300 mb-5">
                <span className="w-7 h-px bg-amber-300" />
                Profil resmi sekolah
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-[4.25rem] leading-[1.02] font-black tracking-[-0.045em] text-white mb-6">
                {profile.nama_sekolah}
              </h1>
              {profile.alamat && (
                <p className="flex items-start gap-3 text-sm sm:text-base text-emerald-50/75 mb-8 leading-relaxed max-w-2xl">
                  <MapPin size={19} className="shrink-0 mt-0.5 text-amber-300" />
                  <span>{profile.alamat}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Link to={ppdbLink} className="group inline-flex items-center gap-3 px-5 py-3 rounded-full bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-black/10 hover:bg-amber-300 transition-colors">
                  <GraduationCap size={18} />
                  <span>Daftar PPDB</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to={blogLink} className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-colors">
                  <BookOpen size={17} /> Berita Sekolah
                </Link>
              </div>
            </div>

            <div className="hidden lg:block rounded-2xl border border-white/15 bg-white/[0.07] backdrop-blur-sm p-6">
              <ShieldCheck size={28} className="text-amber-300 mb-8" />
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/55 mb-2">Identitas Sekolah</p>
              <p className="text-lg font-extrabold mb-5">NPSN {profile.npsn || '—'}</p>
              <div className="h-px bg-white/10 mb-5" />
              <p className="text-xs text-emerald-50/60 leading-relaxed">Informasi akademik, program unggulan, dan penerimaan peserta didik dalam satu profil resmi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PPDB Alert Banner */}
      {ppdbActive && activeGelombangName && (
        <div className="bg-amber-400 text-slate-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-700 animate-pulse" />
              <span className="font-semibold">PPDB Dibuka:</span>
              <span>{activeGelombangName}</span>
            </div>
            <Link to={ppdbLink} className="inline-flex items-center gap-1 font-semibold underline hover:opacity-90 transition text-xs sm:text-sm">
              <span>Daftar Sekarang</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Stats Counter */}
      <section className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-px sm:-mt-7">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-none sm:rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-r border-b lg:border-b-0 border-slate-100 dark:border-gray-800 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"><Users size={20} /></div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stats?.total_siswa ?? 0}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Siswa</div>
            </div>
          </div>
          <div className="p-4 sm:p-5 border-b sm:border-r lg:border-b-0 border-slate-100 dark:border-gray-800 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"><Award size={20} /></div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stats?.total_guru ?? 0}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Guru</div>
            </div>
          </div>
          <div className="p-4 sm:p-5 border-r border-b lg:border-b-0 border-slate-100 dark:border-gray-800 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400"><BookOpen size={20} /></div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stats?.total_kelas ?? 0}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kelas</div>
            </div>
          </div>
          <div className="p-4 sm:p-5 border-b sm:border-r lg:border-b-0 border-slate-100 dark:border-gray-800 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300"><Compass size={20} /></div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stats?.total_jurusan ?? jurusan.length}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jurusan</div>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400"><Sparkles size={20} /></div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stats?.total_ekskul ?? ekskul.length}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ekskul</div>
            </div>
          </div>
        </div>
      </section>
      {/* Main Content Body */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16 sm:space-y-20 flex-1">
        {/* Jam Operasional */}
        {settings && (settings.jam_masuk_sekolah || settings.timezone) && (
          <section className="grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-10 items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400 mb-2">Informasi Sekolah</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Operasional & lokasi</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm">
              {settings.jam_masuk_sekolah && settings.jam_pulang_sekolah && (
                <div className="p-5 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-gray-800">
                  <Clock size={18} className="text-emerald-700 dark:text-emerald-400 mb-4" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Jam Belajar</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {settings.jam_masuk_sekolah} - {settings.jam_pulang_sekolah} WIB
                  </span>
                </div>
              )}
              {settings.timezone && (
                <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100 dark:border-gray-800">
                  <Compass size={18} className="text-emerald-700 dark:text-emerald-400 mb-4" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Zona Waktu</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{settings.timezone}</span>
                </div>
              )}
              {settings.lokasi_sekolah_latitude && settings.lokasi_sekolah_longitude && (
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <MapPin size={18} className="text-emerald-700 dark:text-emerald-400 mb-4" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Koordinat</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {settings.lokasi_sekolah_latitude}, {settings.lokasi_sekolah_longitude}
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${settings.lokasi_sekolah_latitude},${settings.lokasi_sekolah_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-emerald-700 hover:text-emerald-900 rounded-full hover:bg-emerald-50 dark:hover:bg-gray-800"
                    title="Buka Peta"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Program Jurusan */}
        {jurusan.length > 0 && (
          <section>
            <div className="mb-7 flex items-end justify-between gap-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400 mb-2">Program Akademik</p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">Keahlian untuk masa depan</h2>
              </div>
              <p className="hidden md:block text-sm text-slate-500 max-w-sm">Pilihan program terarah untuk membantu setiap siswa mengasah potensi terbaiknya.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jurusan.map((j) => (
                <div key={j.id} className="group bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200 dark:border-gray-800 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all">
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] tracking-wider mb-5">
                    {j.kode}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mb-2">{j.nama}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {j.deskripsi || 'Program pendidikan terstruktur dengan kurikulum terpadu.'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
        {/* Ekstrakurikuler */}
        {ekskul.length > 0 && (
          <section>
            <div className="mb-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400 mb-2">Di luar kelas</p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">Ruang tumbuh & berkarya</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Wadah kreativitas, olahraga, karakter, dan kepemimpinan siswa.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ekskul.map((e) => (
                <div key={e.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200 dark:border-gray-800 flex flex-col justify-between min-h-[210px] hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-5"><Sparkles size={18} /></div>
                    <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mb-2">{e.nama}</h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-5">
                      {e.deskripsi || 'Kegiatan pembinaan minat dan bakat peserta didik.'}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-gray-800 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                    {e.hari && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-primary-500" />
                        <span>Hari: <strong className="text-slate-700 dark:text-slate-200">{HARI_MAP[e.hari] || e.hari}</strong></span>
                      </div>
                    )}
                    {e.jam_mulai && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-primary-500" />
                        <span>Pukul: <strong className="text-slate-700 dark:text-slate-200">{e.jam_mulai.slice(0, 5)} - {e.jam_selesai ? e.jam_selesai.slice(0, 5) : 'selesai'}</strong></span>
                      </div>
                    )}
                    {e.lokasi && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-primary-500" />
                        <span>Lokasi: <strong className="text-slate-700 dark:text-slate-200">{e.lokasi}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Guru */}
        {guru.length > 0 && (
          <section>
            <div className="mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400 mb-2">Sosok di balik pembelajaran</p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">Tenaga pendidik</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{guru.length} pendidik berdedikasi untuk mendampingi siswa.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {guru.map((g) => (
                <div key={g.id} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-slate-200 dark:border-gray-800 flex items-center gap-4 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-[#0d2b24] text-amber-300 flex items-center justify-center font-black text-sm shrink-0 ring-4 ring-emerald-50 dark:ring-emerald-950/30">
                    {g.nama ? g.nama.charAt(0).toUpperCase() : 'G'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm text-slate-950 dark:text-white line-clamp-2 leading-snug">{g.nama}</div>
                    {g.pendidikan_terakhir && <span className="text-xs text-slate-500 dark:text-slate-400">{PENDIDIKAN_MAP[g.pendidikan_terakhir] || 'Pendidik'}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA PPDB */}
        <section className="relative overflow-hidden bg-[#0d2b24] rounded-3xl p-7 sm:p-12 text-white shadow-xl shadow-emerald-950/10">
          <div className="absolute -right-16 -top-24 w-80 h-80 rounded-full border-[60px] border-white/[0.04]" />
          <div className="relative max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-amber-300 mb-3">Penerimaan Peserta Didik Baru</p>
            <h2 className="text-2xl sm:text-4xl leading-tight font-black tracking-tight mb-3 text-white">Mulai perjalanan belajar bersama kami.</h2>
            <p className="text-emerald-50/70 text-sm sm:text-base leading-relaxed mb-7">
              Pendaftaran peserta didik baru dapat dilakukan secara online melalui portal PPDB resmi.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to={ppdbLink} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-amber-400 text-slate-950 font-extrabold text-sm shadow hover:bg-amber-300 transition-colors">
                <CheckCircle2 size={17} />
                <span>Pendaftaran PPDB</span>
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 px-5 py-3 rounded-full hover:bg-white/10 border border-white/20 text-white font-bold text-sm transition-colors">
                <span>Login Portal Sekolah</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-5 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <p>© {new Date().getFullYear()} {profile.nama_sekolah}. Seluruh hak cipta dilindungi.</p>
            {profile.npsn && <p className="mt-0.5">NPSN: {profile.npsn}</p>}
          </div>
          <div className="flex items-center gap-4">
            <Link to={blogLink} className="hover:text-primary-600 transition">Kabar & Artikel</Link>
            <Link to={ppdbLink} className="hover:text-primary-600 transition">Portal PPDB</Link>
            <Link to="/login" className="hover:text-primary-600 transition">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PublicProfile
