import React, { useState, useEffect, useRef } from 'react';
import type { FleetSummaryResult, FlightScenario } from '../types/tariff';
import { Bot, Send, Sparkles, RefreshCw, Key } from 'lucide-react';

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
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('KOI_AI_API_KEY') || '');
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

      if (apiKey.trim()) {
        // If Gemini API Key provided, call Google Gemini 1.5/2.0 Flash API!
        aiAnswerText = await callGeminiApi(textToSend, apiKey, fleetSummary, scenarios, exchangeRateEUR);
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
              Yapay Zeka Havacılık & KÖİ Finansal Asistanı
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Mevcut Hesaplama AI Analiz Sohbeti
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Seçili havalimanı ({fleetSummary.byAirportName}) ve filo hesaplamalarınız hakkında sorular sorun. Uçuş parametrelerinizi değiştirdiğinizde sohbet geçmişi otomatik sıfırlanır.
            </p>
          </div>

          {/* Gemini / OpenAI API Key Setting */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3 shadow-lg">
            <Key className="w-4 h-4 text-amber-400 mr-2 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Google Gemini API Key (Opsiyonel)</span>
              <input
                type="password"
                placeholder="AI Studio Key girin..."
                value={apiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                className="bg-transparent text-xs text-amber-300 font-mono focus:outline-none w-44"
              />
            </div>
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
          onClick={() => handleSendMessage('Uçak başı ortalama maliyet dökümünü çıkar.')}
          className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          ✈️ Uçak başı ortalama maliyet nedir?
        </button>

        <button
          onClick={() => handleSendMessage('Maliyeti düşürmek için hangi opsiyonları kapatabilirim?')}
          className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          🎯 Maliyeti düşürmek için ne yapabilirim?
        </button>

        <button
          onClick={() => handleSendMessage('Euro kuru 45 TL olursa toplam maliyet kaç TL olur?')}
          className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all"
        >
          💱 Kur 45 TL olursa toplam ne olur?
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
              <h3 className="text-base font-bold text-white">AI Asistana Hoş Geldiniz</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Şu anki filonuz ({fleetSummary.totalAircraftCount} Uçak / {fleetSummary.totalConvertedTRY.toLocaleString('tr-TR')} ₺) hakkında merak ettiğiniz soruları sorabilirsiniz.
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
                      {msg.role === 'user' ? 'Siz' : 'AI Havacılık Analisti'}
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
                Hesaplama verileri analiz ediliyor...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="mt-4 pt-4 border-t border-slate-700/80 flex items-center gap-3">
          <input
            type="text"
            placeholder="Hesaplamayla ilgili sorunuzu buraya yazın..."
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
// External Call to Gemini API (Google AI Studio Key)
// ---------------------------------------------------------------------------
async function callGeminiApi(
  userQuery: string,
  apiKey: string,
  fleetSummary: FleetSummaryResult,
  scenarios: FlightScenario[],
  exchangeRateEUR: number
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

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
Kullanıcının yaptığı güncel havalimanı ücret hesaplama verileri aşağıda JSON formatında verilmiştir.
Yanıt verirken Türkçe, profesyonel, net ve somut rakamlar sunarak konuş.

GÜNCEL HESAPLAMA CONTEXTİ:
${JSON.stringify(contextData, null, 2)}`;

  const res = await fetch(url, {
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
  if (!res.ok) {
    throw new Error(data.error?.message || 'Gemini API yanıt vermedi');
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt alınamadı.';
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
