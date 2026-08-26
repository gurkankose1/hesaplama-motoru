import React, { useState, useEffect, useRef } from 'react';
import type { FleetSummaryResult, FlightScenario } from '../types/tariff';
import { Bot, Send, Sparkles, RefreshCw, Key } from 'lucide-react';

// Hardcoded Default Gemini API Key
export const DEFAULT_GEMINI_API_KEY = 'AIzaSyDUXiGQzavr_RD8PXnPx-GK8zgOYGutfas'; 

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AiAssistantTabProps {
  fleetSummary: FleetSummaryResult;
  scenarios: FlightScenario[];
  exchangeRateEUR: number;
}

export const AiAssistantTab: React.FC<AiAssistantTabProps> = ({
  fleetSummary,
  scenarios,
  exchangeRateEUR,
}) => {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [apiKey, setApiKey] = useState<string>(() => DEFAULT_GEMINI_API_KEY || localStorage.getItem('KOI_AI_API_KEY') || '');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-reset chat history whenever calculation state/scenarios change (as requested by user!)
  useEffect(() => {
    setMessages([]);
  }, [scenarios, fleetSummary, exchangeRateEUR]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('KOI_AI_API_KEY', newKey);
  };

  // Generate intelligent response using Gemini API or built-in Aviation AI Analyst
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg: AiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputQuery('');
    setIsLoading(true);

    try {
      let aiAnswerText = '';
      const activeKey = apiKey.trim() || DEFAULT_GEMINI_API_KEY.trim();

      if (activeKey) {
        // Call Gemini 2.5 Flash API with full KÖİ 2026 Tariff Knowledge Base
        aiAnswerText = await callGeminiApi(textToSend, activeKey, fleetSummary, scenarios, exchangeRateEUR);
      } else {
        // Built-in Context-Aware Aviation AI Financial Analyst
        aiAnswerText = generateLocalAiAnalysis(textToSend, fleetSummary, scenarios, exchangeRateEUR);
      }

      const aiMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: aiAnswerText,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI error:', err);
      const errorMsg: AiMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `⚠️ Yanıt oluşturulurken bir hata oluştu: ${err.message || 'API servisi yanıt vermedi'}. Lütfen tekrar deneyiniz.`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* AI Assistant Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Yapay Zeka Havacılık & KÖİ Finansal Asistanı (2026 KÖİ Tam Tarife Eğitlimi)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Mevcut Hesaplama & Tarife AI Sohbeti
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              2026 KÖİ Havalimanı Ücret Tarifeleri (İstanbul IST, Çukurova, Antalya vb.) ve mevcut filonuz hakkında sorular sorun. Parametreler değiştiğinde sohbet otomatik sıfırlanır.
            </p>
          </div>

          {/* Optional Key Settings Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              title="Özel API Key Ayarları"
              className="p-2 text-slate-400 hover:text-amber-300 bg-slate-800/80 border border-slate-700 rounded-xl transition-all"
            >
              <Key className="w-4 h-4" />
            </button>

            {showKeyInput && (
              <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3 shadow-lg">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Google Gemini API Key</span>
                  <input
                    type="password"
                    placeholder="API Key yapıştırın..."
                    value={apiKey}
                    onChange={(e) => handleSaveApiKey(e.target.value)}
                    className="bg-transparent text-xs text-amber-300 font-mono focus:outline-none w-44"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Hızlı Analiz Soruları:
        </span>
        
        <button
          onClick={() => handleSendMessage('Bu filonun en yüksek maliyet kalemi hangisidir?')}
          className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          💡 En yüksek maliyet kalemi nedir?
        </button>

        <button
          onClick={() => handleSendMessage('Yolcu köprüsü, GPU kablo ve PCA havalandırma çarpan kurallarını açıklar mısın?')}
          className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          🔌 GPU Kablo & PCA Kanal Çarpanı nedir?
        </button>

        <button
          onClick={() => handleSendMessage('Yatı uçağı konaklama zamları ve %50 köprü indirimi nasıl uygulanır?')}
          className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          🌙 Yatı Uçağı zamları nasıl hesaplanır?
        </button>

        <button
          onClick={() => handleSendMessage('Uçak başı ortalama maliyet dökümünü çıkar.')}
          className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          ✈️ Uçak başı ortalama maliyet nedir?
        </button>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl min-h-[420px] flex flex-col justify-between">
        
        {/* Messages Feed */}
        <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">AI Havacılık & KÖİ Asistanına Hoş Geldiniz</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                2026 KÖİ Havalimanı Ücret Tarifeleri belgesinin tamamı AI asistanına öğretilmiştir. Hesaplamalarınız veya tarife kuralları hakkında dilediğiniz soruyu sorabilirsiniz.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-md ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {msg.role === 'user' ? 'Siz' : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed shadow-lg whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600/90 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-700/80 text-slate-100 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 border-b border-slate-700/50 pb-1">
                    <span className="font-bold opacity-80">
                      {msg.role === 'user' ? 'Siz' : 'AI Havacılık Analisti (Gemini 2.5 Flash)'}
                    </span>
                    <span className="text-[10px] opacity-60">{msg.timestamp}</span>
                  </div>
                  <div>{msg.text}</div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 text-xs text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                Gemini AI 2026 KÖİ Tarifesini ve hesaplama verilerinizi analiz ediyor...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="mt-4 pt-4 border-t border-slate-700/80 flex items-center gap-3">
          <input
            type="text"
            placeholder="KÖİ Tarifesi veya hesaplamayla ilgili sorunuzu yazın..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            className="flex-1 bg-slate-900 border border-slate-700/90 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 font-medium focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputQuery.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};

// ---------------------------------------------------------------------------
// External Call to Gemini API (Google AI Studio Key) with 2026 KÖİ Tariff Context
// ---------------------------------------------------------------------------
async function callGeminiApi(
  userQuery: string,
  apiKey: string,
  fleetSummary: FleetSummaryResult,
  scenarios: FlightScenario[],
  exchangeRateEUR: number
): Promise<string> {

  // Primary model endpoint: gemini-2.5-flash with fallback to gemini-flash-latest
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey.trim()}`,
  ];

  const contextData = {
    airport: fleetSummary.byAirportName,
    exchangeRateEUR: `${exchangeRateEUR} TL`,
    totalAircraftCount: fleetSummary.totalAircraftCount,
    totalPassengers: fleetSummary.totalPassengers,
    subtotalEUR: `${fleetSummary.totalSubtotalEUR.toFixed(2)} €`,
    subtotalTRY: `${fleetSummary.totalSubtotalTRY.toFixed(2)} ₺`,
    totalConvertedTRY: `${fleetSummary.totalConvertedTRY.toFixed(2)} ₺`,
    categoryBreakdown: fleetSummary.byCategory,
    scenariosSummary: scenarios.map((sc, i) => ({
      scenarioNo: i + 1,
      aircraftType: sc.aircraftType,
      quantity: sc.quantity,
      mtow: sc.mtow,
      seats: sc.seats,
      pax: sc.passengerCount,
      parkingHours: sc.parkingHours,
      category: sc.flightCategory,
      resultConvertedTRY: fleetSummary.resultsByScenario[i]?.totalConvertedTRY,
    }))
  };

  const systemInstruction = `Sen uzman bir Havacılık & DHMİ KÖİ (Kamu Özel Sektör İşbirliği) Finansal Analist yapay zekasısın.
Sana 2026 KÖİ Havalimanı Ücret Tarifeleri Rev.01 belgesinin TÜM KURALLARI EĞİTİLMİŞTİR.

RESMİ 2026 KÖİ TARİFE KURALLARI BİLGİ BANKASI:
1. KONMA (LANDING): MTOW ton kesirleri üst tona tamamlanır. Min MTOW 20t (0-2t uçaklar hariç). Teknik İniş %50 indirimli. İstanbul IST KÖİ Dış Hat: 0-2000 konma arası €13.28/t, İç Hat: 43.33 TL/t.
2. KONAKLAMA (PARKING): İlk 2 SAAT ÜCRETSİZ. 24 saatlik periyotlarda alınır. İGA IST Dış Hat: €4.08/t/24h, İç Hat: 13.02 TL/t/24h.
   Yatı Uçağı Geceleme Zammı (Madde 3.d): 1. Gün 1x, 2. Gün %200 zam (3x), 3. Gün %300 zam (4x), 3 günden uzun sürenin TAMAMINA %500 zam (6x).
3. YOLCU KÖPRÜSÜ (PBB): Her 30 dakika periyot için MTOW tonaj grubuna göre ücretlenir. İlk 2 saat (4 periyot) standart. 2 saati aşan her yarım saat %25 ZAMLI.
   Zorunlu Yatı Kalma (Madde 3.j): Köprüde geceleyen veya açık alan olmaması nedeniyle kalan uçaklara 2 saati aşan süre için %50 İNDİRİMLİ köprü ücreti uygulanır.
   Çoklu Köprü (Madde 3.k): 1 Köprü 1.0x, 2 Köprü %20 ilave (1.2x), 3 Köprü %40 ilave (1.4x).
4. GPU (400Hz ELEKTRİK) & PCA (HAVALANDIRMA) KABLO ZAMLARI (Sayfa 17 Madde 3.f):
   - 1 Kablo/Kanal: 1.0x (%0 zam)
   - 2 Kablo/Kanal: 1.5x (%50 zam)
   - 3 Kablo/Kanal: 2.0x (%100 zam / 2 katı)
   - 4 Kablo/Kanal: 2.5x (%150 zam)
   Birim Fiyatlar: IST GPU Dış Hat €2.23/dk, İç Hat 1.12 TL/dk. PCA Dış Hat €1.21/dk, İç Hat 0.66 TL/dk.
5. SU HİZMETİ: IST Dış Hat/İç Hat <=150t: €22.75 / dolum, >150t: €37.94 / dolum.
6. YOLCU SERVİS & GÜVENLİK HARÇLARI: Giden yolcu (Pax) başınadır. İGA IST Dış Hat Servis €20.00/pax, Güvenlik €3.04/pax. İç Hat Servis €3.00/pax (120 TL), Güvenlik 11.80 TL/pax. PetC (kabin evcil) %30, Avih (uçak altı) %50 ilave yolcu harcı.

KULLANICININ ŞU ANKİ HESAPLAMA CONTEXTİ:
${JSON.stringify(contextData, null, 2)}

Yanıt verirken Türkçe, profesyonel, net, kibar ve somut rakamlarla anlaşılır açıklama yap.`;

  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nKULLANICI SORUSU: ${userQuery}` }]
            }
          ]
        })
      });

      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        lastError = data.error?.message || 'Model yanıt vermedi';
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(lastError || 'Gemini API bağlantı hatası.');
}

// ---------------------------------------------------------------------------
// Built-in Context-Aware Aviation AI Financial Analyst Engine
// ---------------------------------------------------------------------------
function generateLocalAiAnalysis(
  query: string,
  fleetSummary: FleetSummaryResult,
  scenarios: FlightScenario[],
  exchangeRateEUR: number
): string {
  const q = query.toLowerCase();

  if (scenarios.length === 0) {
    return 'Henüz hiçbir uçak senaryosu eklenmedi. Lütfen hesaplama yapabilmek için "Filo & Ücret Hesaplayıcı" sekmesinden en az bir uçak ekleyiniz.';
  }

  // 1. Highest Cost Item Question
  if (q.includes('en yüksek') || q.includes('en fazla') || q.includes('en pahalı') || q.includes('kırılım')) {
    const sortedCategories = [...fleetSummary.byCategory].sort((a, b) => b.convertedTRY - a.convertedTRY);
    const topCat = sortedCategories[0];

    return `📊 **Finansal Dağılım Analizi**:

Seçilen **${fleetSummary.byAirportName}** için en yüksek maliyet oluşturan hizmet kategorisi **${topCat.category}** alanıdır.

* **Top Kategori Tutar**: ${topCat.convertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
* **Toplam Harcama İçindeki Payı**: %${((topCat.convertedTRY / (fleetSummary.totalConvertedTRY || 1)) * 100).toFixed(1)}

**Kategorik Sıralama**:
${sortedCategories.map((c, i) => `${i + 1}. **${c.category}**: ${c.convertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`).join('\n')}`;
  }

  // 2. Per Aircraft Average Cost Question
  if (q.includes('uçak başı') || q.includes('ortalama') || q.includes('tek uçak')) {
    const avgCost = fleetSummary.totalConvertedTRY / fleetSummary.totalAircraftCount;
    return `✈️ **Uçak Başı Ortalama Maliyet Analizi**:

* **Filo Uçak Sayısı**: ${fleetSummary.totalAircraftCount} Uçak
* **Toplam Filo Maliyeti**: ${fleetSummary.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
* **Uçak Başına Düşen Ortalama Maliyet**: **${avgCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺**

**Senaryo Bazlı Uçak Başına Döküm**:
${scenarios.map((sc, i) => {
  const res = fleetSummary.resultsByScenario[i];
  return `- **${sc.aircraftType}** (x${sc.quantity} Uçak): Uçak başı **${res.perAircraftConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺** (${res.perAircraftEUR.toFixed(2)} €)`;
}).join('\n')}`;
  }

  // 3. Cost Optimization / Savings Question
  if (q.includes('düşür') || q.includes('tasarruf') || q.includes('kapat') || q.includes('optimize')) {
    return `🎯 **Maliyet Optimizasyonu & Tasarruf Önerileri**:

1. **Köprü & Ekipman Kullanımı**: Uçağınız körükte uzun kalıyorsa 2 saati aşan sürelerde %25 zam uygulanır. Körük süresini 2 saatin altında tutarak tasarruf sağlayabilirsiniz.
2. **Kablo / Kanal Çarpanları**: GPU (400Hz) ve PCA için 2, 3 veya 4 kablo/kanal kullanılması tutarı %50-%150 oranında artırır. İhtiyaç yoksa 1 kablo/kanal seçmek birim maliyeti düşürür.
3. **Yolcu Servis & Güvenlik Ücretleri**: Yolcu harçları giden yolcu sayısına doğrudan bağlıdır. Yolcu yük faktörüne göre revize edilebilir.
4. **Opsiyonel Checkboxlar**: Kullanmadığınız Follow-Me, ARFF itfaiye nöbeti veya ikram harçlarının tiklerini kaldırarak anında re-calculation yapabilirsiniz.`;
  }

  // 4. Custom Currency Exchange Simulation Question
  if (q.includes('kur') || q.includes('euro') || q.includes('dolar') || q.includes('42') || q.includes('45')) {
    const targetRate = q.includes('45') ? 45 : (q.includes('42') ? 42 : exchangeRateEUR + 2);
    const simulatedTotal = fleetSummary.totalSubtotalTRY + (fleetSummary.totalSubtotalEUR * targetRate);

    return `💱 **Döviz Kuru Simülasyonu**:

* **Mevcut Kur (1 € = ${exchangeRateEUR} TL)**: ${fleetSummary.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
* **Simüle Edilen Kur (1 € = ${targetRate} TL)**: **${simulatedTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺**
* **Fark / Etki**: +${(simulatedTotal - fleetSummary.totalConvertedTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ artış gösterir.`;
  }

  // Default General Summary Answer
  return `🤖 **Havacılık & KÖİ Analiz Özeti**:

Seçili Havalimanı: **${fleetSummary.byAirportName}**

* **Toplam Uçak Sayısı**: ${fleetSummary.totalAircraftCount} Uçak (${fleetSummary.totalFlights} Farklı Senaryo)
* **Toplam Yolcu**: ${fleetSummary.totalPassengers.toLocaleString('tr-TR')} Pax
* **Toplam Euro Tutar**: ${fleetSummary.totalSubtotalEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} €
* **Toplam TL Tutar**: ${fleetSummary.totalSubtotalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
* **TOPLAM TL KARŞILIĞI (1 € = ${exchangeRateEUR} TL)**: **${fleetSummary.totalConvertedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺**

Daha spesifik bir analiz için hızlı soruları tıklayabilir veya özel sorularınızı iletebilirsiniz!`;
}
