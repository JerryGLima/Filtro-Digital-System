/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Layers, 
  Share2, 
  BarChart3, 
  FileText, 
  Info,
  ChevronRight,
  TrendingDown,
  Globe,
  Loader2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Constants ---

type SourceType = 'imprensa' | 'blog' | 'oficial' | 'checagem';

interface Source {
  id: string;
  title: string;
  content: string;
  type: SourceType;
  reliability: number; // 0 to 1
  date: string;
}

interface AnalysisResult {
  status: 'GREEN' | 'YELLOW' | 'RED';
  sourceCount: number;
  diversityScore: number;
  duplicateCount: number;
  biasScore: number;
  echoChamber: boolean;
  conclussion: string;
}

const EMOTIONAL_WORDS = ["absurdo", "grave", "urgente", "escândalo", "chocante", "terrível", "revoltante", "inacreditável"];

const SIMULATED_SOURCES: Source[] = [
  {
    id: '1',
    title: 'Relatório Oficial sobre Impactos Econômicos',
    content: 'O governo publicou dados oficiais sobre o crescimento de 2% no PIB este trimestre, citando estabilidade nos setores primários e aumento de exportações.',
    type: 'oficial',
    reliability: 0.95,
    date: '2024-05-10'
  },
  {
    id: '2',
    title: 'Portal de Notícias Global: Economia em Pauta',
    content: 'Economistas analisam o crescimento tímido do PIB nacional. Embora o governo aponte 2%, especialistas alertam para a inflação subjacente nos bens de consumo.',
    type: 'imprensa',
    reliability: 0.85,
    date: '2024-05-11'
  },
  {
    id: '3',
    title: 'Blog "A Verdade": O Escândalo do PIB',
    content: 'É um absurdo! O governo mente sobre os dados. A situação é grave e urgente. O índice de 2% é um escândalo chocante escondendo a crise real.',
    type: 'blog',
    reliability: 0.3,
    date: '2024-05-12'
  },
  {
    id: '4',
    title: 'Checagem de Fatos: Dados do PIB são verídicos?',
    content: 'Análise detalhada confirma que os 2% relatados pelo governo coincidem com as auditorias externas, apesar das críticas de viés político em redes sociais.',
    type: 'checagem',
    reliability: 0.98,
    date: '2024-05-12'
  },
  {
    id: '5',
    title: 'Blog "Notícias Já": Urgente! Crise no PIB',
    content: 'É um absurdo! O governo mente sobre os dados. A situação é grave e urgente. O índice de 2% é um escândalo chocante escondendo a crise real.',
    type: 'blog',
    reliability: 0.25,
    date: '2024-05-12'
  },
  {
    id: '6',
    title: 'Opinião: O que ninguém te conta sobre o crescimento',
    content: 'Embora os números oficiais mostrem 2%, a percepção nas ruas é de estagnação. Blogs apontam que a situação é grave e o silêncio da imprensa é absurdo.',
    type: 'blog',
    reliability: 0.4,
    date: '2024-05-13'
  },
  {
    id: '7',
    title: 'Agência Nacional: Detalhes das Exportações',
    content: 'O crescimento de 2% no PIB foi impulsionado principalmente pelas commodities e agroindústria, que registraram recordes de embarques no último mês.',
    type: 'imprensa',
    reliability: 0.9,
    date: '2024-05-11'
  },
  {
    id: '8',
    title: 'Site de Notícias Pop: O governo e o PIB',
    content: 'Destaque para o crescimento de 2% no PIB nacional, com foco em estabilidade e exportações em alta nos setores primários conforme dados oficiais.',
    type: 'imprensa',
    reliability: 0.75,
    date: '2024-05-10'
  }
];

// --- Logic Helpers ---

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().replace(/[.,!?:;]/g, '').split(/\s+/));
  const words2 = new Set(text2.toLowerCase().replace(/[.,!?:;]/g, '').split(/\s+/));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

function analyzeBias(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let count = 0;
  EMOTIONAL_WORDS.forEach(w => {
    if (words.includes(w)) count++;
  });
  return Math.min(count / 3, 1); // Normalize to 0-1 based on top 3 words
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
  <motion.div 
    whileHover={{ y: -4, scale: 1.02 }}
    className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between group transition-colors hover:border-slate-700"
  >
    <div className="flex items-start justify-between mb-6">
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500 ring-1 ring-${color}-500/20`}>
        <Icon size={22} />
      </div>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</span>
    </div>
    <div>
      <h3 className="text-4xl font-black text-white tracking-tighter mb-1">{value}</h3>
      {subValue && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{subValue}</p>}
    </div>
  </motion.div>
);

const ProgressBar = ({ progress, color = 'blue' }: { progress: number; color?: string }) => (
  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${progress * 100}%` }}
      className={`h-full bg-${color}-500`}
    />
  </div>
);

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);

  const startAnalysis = () => {
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    setProgress(0);
    setAnalysisResult(null);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 1) {
          clearInterval(interval);
          return 1;
        }
        return prev + 0.1;
      });
    }, 200);

    // Run analysis logic after "fetching"
    setTimeout(() => {
      const bias = analyzeBias(inputText);
      
      // Calculate duplication in our simulated source set
      let duplicates = 0;
      for (let i = 0; i < SIMULATED_SOURCES.length; i++) {
        for (let j = i + 1; j < SIMULATED_SOURCES.length; j++) {
          if (calculateSimilarity(SIMULATED_SOURCES[i].content, SIMULATED_SOURCES[j].content) > 0.8) {
            duplicates++;
          }
        }
      }

      const uniqueTypes = new Set(SIMULATED_SOURCES.map(s => s.type)).size;
      const diversity = uniqueTypes / 4; // Max 4 types

      // Heurestic for Echo Chamber
      const echoChamber = duplicates >= 2 || diversity < 0.5;

      // Status Logic
      let status: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
      if (duplicates > 3 || (diversity < 0.5 && bias > 0.6)) {
        status = 'RED';
      } else if (bias > 0.4 || duplicates > 1 || diversity < 0.75) {
        status = 'YELLOW';
      }

      let conclussion = "A análise mostra um ecossistema de informações equilibrado e fontes diversificadas.";
      if (status === 'RED') {
        conclussion = "Alta taxa de duplicação detectada e baixo índice de diversidade. Possível campanha de desinformação ou câmara de eco.";
      } else if (status === 'YELLOW') {
        conclussion = "Atenção: Identificada moderada replicação de conteúdo e presença de viés emocional em fontes secundárias.";
      }

      setAnalysisResult({
        status,
        sourceCount: SIMULATED_SOURCES.length,
        diversityScore: diversity,
        duplicateCount: duplicates,
        biasScore: bias,
        echoChamber,
        conclussion
      });
      setIsAnalyzing(false);
    }, 2500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GREEN': return 'emerald';
      case 'YELLOW': return 'amber';
      case 'RED': return 'rose';
      default: return 'slate';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'GREEN': return 'Confiável';
      case 'YELLOW': return 'Atenção';
      case 'RED': return 'Suspeito';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="bg-emerald-500 p-2 rounded-xl text-slate-950 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={22} />
            </div>
            <h1 className="font-black text-xl tracking-tighter uppercase">
              VerifEye <span className="text-slate-500 font-medium">OS 1.0</span>
            </h1>
          </div>
          <nav className="hidden md:flex gap-8 items-center">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Sistemas Ativos</span>
            </div>
            <a href="#" className="text-xs font-bold text-slate-100 hover:text-emerald-500 transition-colors uppercase tracking-widest">Dashboard</a>
            <a href="#" className="text-xs font-bold text-slate-500 cursor-not-allowed uppercase tracking-widest">Histórico</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6"
          >
            Monitoramento de Integridade Digital
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black text-white mb-6 tracking-tighter leading-none"
          >
            DETECÇÃO <span className="text-emerald-500">AVANÇADA</span> DE DESINFORMAÇÃO
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed uppercase tracking-wide font-medium"
          >
            Rastreie cadeias de replicação, identifique câmaras de eco e analise o espectro de viés emocional através de Redes Neurais Simuladas.
          </motion.p>
        </div>

        {/* Input Section */}
        <section className="max-w-4xl mx-auto mb-20 px-4">
          <div className="bg-slate-900 p-2 rounded-2xl shadow-2xl shadow-black/80 flex flex-col sm:flex-row items-center gap-2 border border-slate-800 ring-1 ring-white/5">
            <div className="flex-1 w-full pl-6 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Insira o texto ou tema para análise profunda..."
                className="w-full py-5 pl-12 pr-6 outline-none bg-transparent text-white placeholder:text-slate-600 font-bold"
                onKeyDown={(e) => e.key === 'Enter' && startAnalysis()}
              />
            </div>
            <button 
              onClick={startAnalysis}
              disabled={isAnalyzing || !inputText.trim()}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 px-10 py-5 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processando
                </>
              ) : (
                <>
                  Analisar Dados
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
          
          {isAnalyzing && (
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-3 px-1">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Varredura Global em curso</span>
                <span className="text-[10px] font-mono text-slate-500 tracking-widest">{Math.round(progress * 100)}%</span>
              </div>
              <div className="bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                />
              </div>
            </div>
          )}
        </section>

        {/* Results Section */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {/* Status Header */}
              <div className="p-10 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-2xl flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-lg text-[10px] font-mono text-slate-500 uppercase tracking-widest border border-white/5">
                    Hash: #{(Math.random() * 100000).toFixed(0)}
                  </div>
                </div>
                
                <div className="relative">
                  <div className={`w-36 h-36 rounded-full border-2 border-${getStatusColor(analysisResult.status)}-500/20 flex items-center justify-center relative`}>
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }} 
                      transition={{ duration: 4, repeat: Infinity }}
                      className={`absolute inset-0 rounded-full bg-${getStatusColor(analysisResult.status)}-500/10 blur-xl`} 
                    />
                    <div className={`w-28 h-28 rounded-full bg-${getStatusColor(analysisResult.status)}-500 flex items-center justify-center text-slate-950 shadow-[0_0_50px_rgba(var(--status-color),0.4)] z-10 animate-pulse`}>
                      {analysisResult.status === 'GREEN' && <ShieldCheck size={52} strokeWidth={2.5} />}
                      {analysisResult.status === 'YELLOW' && <AlertTriangle size={52} strokeWidth={2.5} />}
                      {analysisResult.status === 'RED' && <AlertCircle size={52} strokeWidth={2.5} />}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 text-center md:text-left z-10">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                    <div className={`px-4 py-1 rounded-full bg-${getStatusColor(analysisResult.status)}-500/10 border border-${getStatusColor(analysisResult.status)}-500/20`}>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-${getStatusColor(analysisResult.status)}-500`}>
                        Classificação Final
                      </span>
                    </div>
                    <h3 className="text-4xl font-black text-white tracking-tighter uppercase">
                      CONTEÚDO <span className={`text-${getStatusColor(analysisResult.status)}-500`}>
                        {getStatusLabel(analysisResult.status)}
                      </span>
                    </h3>
                  </div>
                  <p className="text-slate-400 text-lg leading-relaxed max-w-2xl font-medium">
                    {analysisResult.conclussion}
                  </p>
                </div>
                
                <div className="flex flex-col gap-3 z-10">
                  <button className="p-3.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-white border border-slate-700 transition-all shadow-lg active:scale-95">
                    <Share2 size={20} />
                  </button>
                  <button onClick={startAnalysis} className="p-3.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-white border border-slate-700 transition-all shadow-lg active:scale-95">
                    <RefreshCw size={20} />
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Fontes Analisadas" 
                  value={analysisResult.sourceCount} 
                  icon={Globe} 
                  color="indigo" 
                  subValue="Simulação em tempo real"
                />
                <StatCard 
                  title="Diversidade" 
                  value={`${Math.round(analysisResult.diversityScore * 100)}%`} 
                  icon={Layers} 
                  color="emerald" 
                  subValue={analysisResult.diversityScore > 0.7 ? "Ampla variedade" : "Baixo espectro"}
                />
                <StatCard 
                  title="Textos Duplicados" 
                  value={analysisResult.duplicateCount} 
                  icon={TrendingDown} 
                  color="rose" 
                  subValue="Similaridade > 80%"
                />
                <StatCard 
                  title="Viés Emocional" 
                  value={analysisResult.biasScore > 0.6 ? "Alto" : analysisResult.biasScore > 0.3 ? "Médio" : "Baixo"} 
                  icon={BarChart3} 
                  color="amber" 
                  subValue={`${Math.round(analysisResult.biasScore * 100)}% de intensidade`}
                />
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sources List */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="font-black text-white uppercase tracking-widest text-xs px-2 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Rastreamento de Fontes
                  </h4>
                  <div className="space-y-3">
                    {SIMULATED_SOURCES.map((source, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={source.id} 
                        className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg hover:border-slate-700 transition-all group cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <span className={`text-[9px] uppercase font-black tracking-[0.2em] px-2.5 py-1 rounded-md ${
                            source.type === 'oficial' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                            source.type === 'checagem' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            source.type === 'imprensa' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {source.type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">{source.date}</span>
                        </div>
                        <h5 className="font-black text-slate-100 mb-3 group-hover:text-emerald-500 transition-colors uppercase text-sm tracking-tight leading-tight">
                          {source.title}
                        </h5>
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                          {source.content}
                        </p>
                        <div className="mt-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full ${source.reliability > 0.7 ? 'bg-emerald-500' : source.reliability > 0.4 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${source.reliability * 100}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Confiança</span>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Analysis Visualizer */}
                <div className="space-y-4">
                  <h4 className="font-black text-white uppercase tracking-widest text-xs px-2 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Mapeamento Espectral
                  </h4>
                  <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-10">
                    {/* Simple CSS Graph for Bias Distribution */}
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Intensidade de Viés</span>
                        <span className="text-[10px] font-mono text-emerald-500 uppercase">Live Analytics</span>
                      </div>
                      <div className="h-44 flex items-end justify-between gap-3">
                        {[0.2, 0.4, 0.1, 0.9, 0.3, 0.6, 0.2, 0.4].map((h, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                             <motion.div 
                               initial={{ height: 0 }}
                               animate={{ height: `${h * 100}%` }}
                               className={`w-full rounded-t-md transition-all group-hover:brightness-125 ${i === 3 ? 'bg-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : i === 5 ? 'bg-amber-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-slate-800'}`}
                             />
                             <div className="w-1 h-1 rounded-full bg-slate-700" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-800 space-y-5">
                      <div className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-slate-800 transition-all group-hover:scale-110 ${analysisResult.echoChamber ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          <Layers size={22} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase tracking-widest">Câmara de Eco</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{analysisResult.echoChamber ? 'Redundância Crítica' : 'Distribuição Saudável'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-slate-800 transition-all group-hover:scale-110">
                          <Share2 size={22} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase tracking-widest">Replicação</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{analysisResult.duplicateCount} VETORES IDENTIFICADOS</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
                      <Info size={18} className="text-slate-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-wider italic">
                        AVISO: ESTA ANÁLISE É GERADA POR PADRÕES ALGORÍTMICOS DE CÓDIGO ABERTO. VERIFIQUE SEMPRE A FONTE ORIGINAL.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State / Footer */}
        {!analysisResult && !isAnalyzing && (
          <div className="mt-20 flex flex-col items-center opacity-30 select-none">
            <Globe size={80} className="text-slate-400 mb-6" />
            <p className="text-slate-400 font-medium">Aguardando entrada de dados para iniciar varredura global...</p>
          </div>
        )}
      </main>

      <footer className="mt-auto py-12 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" />
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">© 2024 VerifEye Verity OS. Terminal Seguro.</p>
          </div>
          <div className="flex gap-10">
            <a href="#" className="text-slate-600 hover:text-emerald-500 text-[10px] font-black uppercase tracking-widest transition-colors">Termos de Uso</a>
            <a href="#" className="text-slate-600 hover:text-emerald-500 text-[10px] font-black uppercase tracking-widest transition-colors">Protocolo de Privacidade</a>
            <a href="#" className="text-slate-600 hover:text-emerald-500 text-[10px] font-black uppercase tracking-widest transition-colors">Metodologia 1.0</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
