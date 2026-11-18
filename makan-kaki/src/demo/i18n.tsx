// Four-language support for the demo. Each phrase is keyed by its English text;
// anything missing falls back to English. Translations should be checked by native speakers.
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Lang } from './data'

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' },
  { id: 'ms', label: 'Melayu' },
  { id: 'ta', label: 'தமிழ்' },
]

type Row = [zh: string, ms: string, ta: string]
const D: Record<string, Row> = {
  // common
  'Log out': ['退出', 'Log keluar', 'வெளியேறு'],
  'Language': ['语言', 'Bahasa', 'மொழி'],
  'Home': ['首页', 'Utama', 'முகப்பு'],
  'Orders': ['订单', 'Pesanan', 'ஆர்டர்கள்'],
  'Visits': ['探店', 'Lawatan', 'வருகைகள்'],
  'Payouts': ['付款', 'Bayaran', 'பணம் வழங்கல்'],
  'More': ['更多', 'Lagi', 'மேலும்'],
  'Offers': ['邀约', 'Tawaran', 'வாய்ப்புகள்'],
  'My visits': ['我的探店', 'Lawatan saya', 'என் வருகைகள்'],
  'Earnings': ['收入', 'Pendapatan', 'வருமானம்'],
  'Profile': ['个人资料', 'Profil', 'சுயவிவரம்'],
  'Back': ['返回', 'Kembali', 'பின்செல்'],
  'Save': ['保存', 'Simpan', 'சேமி'],
  'Cancel': ['取消', 'Batal', 'ரத்து செய்'],
  'Continue': ['继续', 'Teruskan', 'தொடரவும்'],
  'Done': ['完成', 'Selesai', 'முடிந்தது'],
  'Copy': ['复制', 'Salin', 'நகலெடு'],
  'Copied': ['已复制', 'Disalin', 'நகலெடுக்கப்பட்டது'],
  'Download CSV': ['下载 CSV', 'Muat turun CSV', 'CSV பதிவிறக்கு'],
  'Sign up': ['注册', 'Daftar', 'பதிவு செய்'],
  'Log in': ['登录', 'Log masuk', 'உள்நுழை'],
  'Demo tour': ['演示导览', 'Lawatan demo', 'டெமோ சுற்றுலா'],
  'Reset demo': ['重置演示', 'Set semula demo', 'டெமோவை மீட்டமை'],
  'Mobile number': ['手机号码', 'Nombor telefon', 'கைபேசி எண்'],
  'Send WhatsApp code': ['发送 WhatsApp 验证码', 'Hantar kod WhatsApp', 'WhatsApp குறியீட்டை அனுப்பு'],
  'Enter the 6-digit code': ['输入6位验证码', 'Masukkan kod 6 digit', '6 இலக்க குறியீட்டை உள்ளிடவும்'],
  'Verify': ['验证', 'Sahkan', 'சரிபார்'],

  // owner
  'Live orders': ['实时订单', 'Pesanan langsung', 'நேரடி ஆர்டர்கள்'],
  'New': ['新订单', 'Baru', 'புதியது'],
  'Preparing': ['准备中', 'Sedang disediakan', 'தயாராகிறது'],
  'Ready': ['可取餐', 'Sedia', 'தயார்'],
  'Completed': ['已完成', 'Selesai', 'முடிந்தது'],
  'Cancelled': ['已取消', 'Dibatalkan', 'ரத்து செய்யப்பட்டது'],
  'Refunded': ['已退款', 'Dipulangkan', 'பணம் திருப்பியளிக்கப்பட்டது'],
  'Start preparing': ['开始准备', 'Mula sediakan', 'தயாரிக்கத் தொடங்கு'],
  'Mark ready': ['标记可取', 'Tanda sedia', 'தயார் எனக் குறி'],
  'Complete': ['完成订单', 'Selesaikan', 'முடி'],
  'Refund': ['退款', 'Pulangkan wang', 'பணத்தைத் திருப்பு'],
  'Results': ['成效', 'Keputusan', 'முடிவுகள்'],
  'Coded orders': ['带码订单', 'Pesanan berkod', 'குறியீட்டு ஆர்டர்கள்'],
  'Sales from coded orders': ['带码订单销售额', 'Jualan pesanan berkod', 'குறியீட்டு ஆர்டர் விற்பனை'],
  'Cost per new diner': ['每位新顾客成本', 'Kos setiap pelanggan baru', 'ஒரு புதிய வாடிக்கையாளருக்கான செலவு'],
  'Best creator': ['最佳创作者', 'Pencipta terbaik', 'சிறந்த படைப்பாளர்'],
  'Best dish': ['最受欢迎菜品', 'Hidangan terbaik', 'சிறந்த உணவு'],
  'Views': ['观看次数', 'Tontonan', 'பார்வைகள்'],
  'Book creator visits': ['预约创作者探店', 'Tempah lawatan pencipta', 'படைப்பாளர் வருகைகளை முன்பதிவு செய்'],
  'Menu': ['菜单', 'Menu', 'மெனு'],
  'QR stand': ['二维码立牌', 'Dirian QR', 'QR நிலைப்பலகை'],
  'Staff accounts': ['员工账号', 'Akaun kakitangan', 'பணியாளர் கணக்குகள்'],
  'Settings and support': ['设置与支持', 'Tetapan dan sokongan', 'அமைப்புகள் மற்றும் உதவி'],
  'Creator profiles': ['创作者资料', 'Profil pencipta', 'படைப்பாளர் சுயவிவரங்கள்'],
  'Plan and billing': ['配套与账单', 'Pelan dan bil', 'திட்டம் மற்றும் கட்டணம்'],
  'Sold out': ['已售罄', 'Habis dijual', 'விற்றுத் தீர்ந்தது'],
  'Available': ['供应中', 'Ada', 'கிடைக்கும்'],
  'Add dish': ['添加菜品', 'Tambah hidangan', 'உணவைச் சேர்'],
  'Simulate a new order': ['模拟新订单', 'Simulasi pesanan baru', 'புதிய ஆர்டரை உருவகப்படுத்து'],
  'Choose a plan': ['选择配套', 'Pilih pelan', 'திட்டத்தைத் தேர்ந்தெடு'],
  'Pay and payout setup': ['付款与收款设置', 'Bayaran dan tetapan pembayaran', 'கட்டணம் மற்றும் பணம் பெறும் அமைப்பு'],
  'Stall profile': ['摊位资料', 'Profil gerai', 'கடை சுயவிவரம்'],

  // creator
  'Visit offers': ['探店邀约', 'Tawaran lawatan', 'வருகை வாய்ப்புகள்'],
  'Accept visit': ['接受探店', 'Terima lawatan', 'வருகையை ஏற்றுக்கொள்'],
  'Visit brief': ['探店说明', 'Taklimat lawatan', 'வருகை விளக்கம்'],
  'Check in': ['签到', 'Daftar masuk', 'வருகையைப் பதிவு செய்'],
  'Submit post': ['提交帖子', 'Hantar hantaran', 'பதிவைச் சமர்ப்பி'],
  'My code': ['我的代码', 'Kod saya', 'என் குறியீடு'],
  'Performance': ['表现', 'Prestasi', 'செயல்திறன்'],
  'Ratings': ['评分', 'Penilaian', 'மதிப்பீடுகள்'],
  'Pay': ['报酬', 'Bayaran', 'ஊதியம்'],
  'Dishes to feature': ['重点菜品', 'Hidangan untuk ditonjolkan', 'காட்ட வேண்டிய உணவுகள்'],
  'Languages wanted': ['所需语言', 'Bahasa yang dikehendaki', 'தேவையான மொழிகள்'],
  "Do's": ['建议', 'Perlu', 'செய்ய வேண்டியவை'],
  "Don'ts": ['禁忌', 'Jangan', 'செய்யக் கூடாதவை'],

  // diner checkout
  'Choose your language': ['选择语言', 'Pilih bahasa anda', 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்'],
  'Featured in the video': ['视频推荐', 'Dalam video', 'வீடியோவில் இடம்பெற்றது'],
  'Full menu': ['全部菜单', 'Menu penuh', 'முழு மெனு'],
  'Add': ['加入', 'Tambah', 'சேர்'],
  'Your order': ['您的订单', 'Pesanan anda', 'உங்கள் ஆர்டர்'],
  'Creator code': ['创作者代码', 'Kod pencipta', 'படைப்பாளர் குறியீடு'],
  'Apply': ['使用', 'Guna', 'பயன்படுத்து'],
  'Dine in': ['堂食', 'Makan di sini', 'இங்கே சாப்பிட'],
  'Takeaway': ['外带', 'Bungkus', 'எடுத்துச் செல்ல'],
  'Table number': ['桌号', 'Nombor meja', 'மேசை எண்'],
  'Pay with PayNow': ['使用 PayNow 付款', 'Bayar dengan PayNow', 'PayNow மூலம் செலுத்து'],
  'Total': ['合计', 'Jumlah', 'மொத்தம்'],
  'Order number': ['订单号', 'Nombor pesanan', 'ஆர்டர் எண்'],
  'We got your order': ['已收到您的订单', 'Pesanan anda diterima', 'உங்கள் ஆர்டர் கிடைத்தது'],
  'Your food is being prepared': ['正在为您准备', 'Makanan anda sedang disediakan', 'உங்கள் உணவு தயாராகிறது'],
  'Your order is ready!': ['您的餐点好了！', 'Pesanan anda sudah siap!', 'உங்கள் ஆர்டர் தயார்!'],
  'Enjoy your meal': ['请慢用', 'Selamat menjamu selera', 'உணவை ரசியுங்கள்'],
  'Receipt': ['收据', 'Resit', 'ரசீது'],
  'Review order': ['查看订单', 'Semak pesanan', 'ஆர்டரைச் சரிபார்'],
  'Code applied': ['代码已使用', 'Kod digunakan', 'குறியீடு பயன்படுத்தப்பட்டது'],
  'Not valid at this stall': ['此摊位不适用', 'Tidak sah di gerai ini', 'இந்தக் கடையில் செல்லாது'],
  'Scan with your banking app': ['用银行应用扫码', 'Imbas dengan aplikasi bank anda', 'உங்கள் வங்கி செயலியால் ஸ்கேன் செய்யவும்'],
  "I've paid": ['我已付款', 'Saya sudah bayar', 'நான் செலுத்திவிட்டேன்'],
  'Optional: get a WhatsApp when it is ready': ['可选：餐点好了用 WhatsApp 通知我', 'Pilihan: terima WhatsApp apabila siap', 'விருப்பம்: தயாரானதும் WhatsApp பெறுக'],
  'Order more': ['继续点餐', 'Pesan lagi', 'மேலும் ஆர்டர் செய்'],
  'No code? No problem. Your order still goes through.': ['没有代码？没关系，照样可以下单。', 'Tiada kod? Tiada masalah. Pesanan anda tetap diterima.', 'குறியீடு இல்லையா? பரவாயில்லை. உங்கள் ஆர்டர் செல்லும்.'],
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void } | null>(null)
const STORE = 'mk-demo-lang'

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem(STORE) as Lang) || 'en' } catch { return 'en' }
  })
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(STORE, l) } catch { /* blocked */ } }
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  const c = useContext(LangContext)
  if (!c) throw new Error('useLang outside LangProvider')
  const idx = { en: -1, zh: 0, ms: 1, ta: 2 }[c.lang]
  const t = (en: string) => (idx < 0 ? en : D[en]?.[idx] ?? en)
  return { ...c, t }
}

export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLang()
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="sr-only">{t('Language')}</span>
      <span aria-hidden className="text-base">🌐</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className={`rounded-lg border border-brown-line bg-white font-semibold text-brown ${compact ? 'px-1.5 py-1 text-xs' : 'px-2 py-1.5 text-sm'}`}
      >
        {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
      </select>
    </label>
  )
}
