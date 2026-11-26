import type { TranslationKey } from './en';

/**
 * Initial Amharic translations for foundation strings.
 * Business data from the backend is never translated — only UI chrome.
 */
export const am: Record<TranslationKey, string> = {
  'app.name': 'የተዋቀረ የሽያጭ መድረክ',
  'nav.status': 'የመድረኩ ሁኔታ',
  'language.label': 'ቋንቋ',
  'language.en': 'English',
  'language.am': 'አማርኛ',
  'status.eyebrow': 'የተዋቀረ የሽያጭ መድረክ',
  'status.title': 'የመድረኩ ሁኔታ',
  'status.lede':
    'ለግሮሰሪ፣ ፋሽን፣ ፋርማሲ እና የውበት ሽያጭ የመጀመሪያ-ደረጃ አካባቢ። ይህ ስሪት ግንኙነትን ብቻ ያረጋግጣል፤ የንግድ ሞጁሎች ገና አልነቁም።',
  'status.overall.checking': 'በመመርመር ላይ',
  'status.overall.healthy': 'ሁሉም ስርዓቶች በስራ ላይ',
  'status.overall.degraded': 'የተዳከመ',
  'status.overall.unreachable': 'ሊደረስበት አልቻለም',
  'status.api.title': 'የAPI አገልግሎት',
  'status.api.live': 'በስራ ላይ',
  'status.api.unreachable': 'ሊደረስበት አልቻለም',
  'status.api.checking': 'በመመርመር ላይ…',
  'status.api.version': 'ስሪት',
  'status.api.uptime': 'የስራ ጊዜ',
  'status.db.title': 'ዳታቤዝ',
  'status.db.reachable': 'ሊደረስበት ይችላል',
  'status.db.down': 'ሊደረስበት አይችልም',
  'status.db.checking': 'በመመርመር ላይ…',
  'status.db.readiness': 'ዝግጁነት',
  'status.db.passing': 'ያለፈ',
  'status.db.failing': 'ያልፈ',
  'status.db.latency': 'መዘግየት',
  'status.error.unreachable': 'API-ን ማግኘት አልተቻለም። በወይድ 4000 ላይ እየሰራ ነው?',
  'status.checkAgain': 'እንደገና ይመርሙ',
  'status.checking': 'በመመርመር ላይ…',
  'status.lastChecked': 'መጨረሻ የተመረመረ',
  'auth.login.title': 'ግባ',
  'auth.login.pending':
    'ማረጋገጫ ገና አልተዘጋጀም። የመጀመሪያ-ገፅ የመግቢያ ውል እስካሁን እየተዘጋጀ ነው፣ ስለዚህ ይህ ገጽ በክብር መግቢያ አያከናውንም። የንግድ ሞጁሎች ከAPIው ሲሰጡ እዚህ ይታያሉ።',
  'auth.login.backToStatus': 'ወደ የመድረክ ሁኔታ ተመለስ',
  'shell.title': 'የስራ ቦታ',
  'shell.planned': 'የታቀደ ሞጁል',
};
