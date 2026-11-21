import React, { useState, useMemo, useDeferredValue } from 'react';
import { useLanguage } from '../hooks/useLanguage.jsx';
import {
  HelpCircle,
  Search,
  ChevronDown,
  Phone,
  Mail,
  Building,
  Sparkles,
  Shield,
  Clock,
  Camera,
  MapPin,
  Mic,
  Languages,
  CheckCircle,
  Lock,
} from 'lucide-react';

const FAQ_ITEMS = [
  { id: 1, qKey: 'faq1_q', aKey: 'faq1_a', icon: CheckCircle, category: 'Reporting' },
  { id: 2, qKey: 'faq2_q', aKey: 'faq2_a', icon: Camera, category: 'Reporting' },
  { id: 3, qKey: 'faq3_q', aKey: 'faq3_a', icon: Sparkles, category: 'AI & Triage' },
  { id: 4, qKey: 'faq4_q', aKey: 'faq4_a', icon: Clock, category: 'AI & Triage' },
  { id: 5, qKey: 'faq5_q', aKey: 'faq5_a', icon: MapPin, category: 'Tracking' },
  { id: 6, qKey: 'faq6_q', aKey: 'faq6_a', icon: Shield, category: 'Community' },
  { id: 7, qKey: 'faq7_q', aKey: 'faq7_a', icon: Clock, category: 'Tracking' },
  { id: 8, qKey: 'faq8_q', aKey: 'faq8_a', icon: Mic, category: 'Voice Assistant' },
  { id: 9, qKey: 'faq9_q', aKey: 'faq9_a', icon: Languages, category: 'Platform' },
  { id: 10, qKey: 'faq10_q', aKey: 'faq10_a', icon: Lock, category: 'Security' },
  { id: 11, qKey: 'faq11_q', aKey: 'faq11_a', icon: Shield, category: 'Security' },
  { id: 12, qKey: 'faq12_q', aKey: 'faq12_a', icon: Building, category: 'Departments' },
];

export default function HelpPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [openIds, setOpenIds] = useState(new Set([1])); // First FAQ open by default

  const toggleAccordion = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredFaqs = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();
    if (!q) return FAQ_ITEMS;

    return FAQ_ITEMS.filter((item) => {
      const question = t(item.qKey).toLowerCase();
      const answer = t(item.aKey).toLowerCase();
      const category = item.category.toLowerCase();
      return question.includes(q) || answer.includes(q) || category.includes(q);
    });
  }, [deferredSearchQuery, t]);

  return (
    <div className="min-h-screen bg-[#F8FAF8] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Block */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#188038] shadow-xs">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium font-heading text-[#202124]">
            {t('helpTitle')}
          </h1>
          <p className="text-sm text-[#5F6368] max-w-xl mx-auto leading-relaxed">
            {t('helpSubtitle')}
          </p>
        </div>

        {/* Real-Time Search Box */}
        <div className="relative max-w-2xl mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('helpSearchPlaceholder')}
            className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-[#DADCE0] bg-white text-[#202124] placeholder-[#5F6368] shadow-sm focus:border-[#188038] focus:ring-2 focus:ring-[#188038]/20 outline-none transition-all"
            aria-label="Search frequently asked questions"
          />
          <Search className="w-5 h-5 text-[#5F6368] absolute left-3.5 top-3.5 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-xs text-[#5F6368] hover:text-[#202124] px-1.5 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3" role="region" aria-label="Frequently Asked Questions">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#DADCE0] p-6 shadow-xs">
              <HelpCircle className="w-8 h-8 text-[#5F6368] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[#5F6368]">{t('helpNoResults')}</p>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openIds.has(faq.id);
              const Icon = faq.icon;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-xl border border-[#DADCE0] shadow-xs overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${faq.id}`}
                    id={`faq-btn-${faq.id}`}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#F8FAF8] focus:outline-none focus:bg-[#F1F8F3] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E6F4EA] text-[#188038] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm sm:text-base font-medium text-[#202124]">
                        {t(faq.qKey)}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-[#5F6368] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#188038]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div
                      id={`faq-answer-${faq.id}`}
                      role="region"
                      aria-labelledby={`faq-btn-${faq.id}`}
                      className="px-5 pb-5 pt-1 text-sm text-[#5F6368] leading-relaxed border-t border-[#F1F3F4] bg-[#FAFCFA]"
                    >
                      <p className="pl-11">{t(faq.aKey)}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* "Still Need Help?" Contact Card */}
        <div className="bg-white rounded-xl border border-[#DADCE0] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-semibold text-[#188038] uppercase tracking-wider">
                {t('helpDemoContact')}
              </span>
              <h3 className="text-lg font-medium text-[#202124]">{t('helpNeedMore')}</h3>
              <p className="text-xs text-[#5F6368] max-w-md">{t('helpNeedMoreDesc')}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <a
                href="tel:18004250026"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-control text-xs font-medium text-[#202124] bg-[#F1F3F4] hover:bg-[#E8EAED] border border-[#DADCE0] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#188038]" />
                <span>{t('helpPhone')}</span>
              </a>

              <a
                href="mailto:helpdesk@civicresolve.gov"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-control text-xs font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-sm transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{t('helpEmail')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
