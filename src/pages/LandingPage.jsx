import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useLanguage } from '../hooks/useLanguage.jsx';
import { statsApi, issuesApi } from '../lib/api.js';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatusChip from '../components/StatusChip.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { ChartBoundary, TrendLineChart } from '../components/charts/index.js';
import {
  ShieldAlert,
  PlusCircle,
  MapPin,
  Camera,
  Cpu,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  Building2,
  LayoutDashboard,
} from 'lucide-react';

export default function LandingPage() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, issuesData, trendsData] = await Promise.all([
          statsApi.getStats(),
          issuesApi.getAll({ sort: 'criticalFirst' }),
          statsApi.getTrends().catch(() => null),
        ]);
        if (statsData?.stats) setStats(statsData.stats);
        if (issuesData?.issues) setRecentIssues(issuesData.issues.slice(0, 4));
        if (trendsData?.days) setTrendData(trendsData);
      } catch (err) {
        console.warn('Failed to fetch landing stats:', err);
      } finally {
        setLoading(false);
        setLoadingTrends(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section with Responsive Hero Image and Bilingual Brand Block */}
      <section className="relative overflow-hidden pt-10 pb-16 md:py-20 bg-gradient-to-b from-[#F1F8F3] to-[#FFFFFF] border-b border-[#DADCE0]">
        {/* Responsive Background Picture */}
        <picture className="absolute inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
          <source srcSet="/images/civic-hero.webp" media="(min-width: 640px)" type="image/webp" />
          <source srcSet="/images/civic-hero-mobile.webp" type="image/webp" />
          <img
            src="/images/civic-hero.png"
            alt=""
            className="w-full h-full object-cover object-bottom opacity-35 sm:opacity-40"
            style={{ backgroundAttachment: 'scroll' }}
          />
        </picture>

        {/* Gradient Overlay for 4.5:1 text contrast on the text side */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F1F8F3]/95 via-[#F1F8F3]/85 to-transparent pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Top-Right Language Switcher Toggle */}
          <div className="flex justify-end mb-4">
            <LanguageSwitcher size="sm" />
          </div>

          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6F4EA] text-[#188038] text-xs font-medium tracking-wide border border-[#188038]/30">
              <ShieldAlert className="w-4 h-4 text-[#188038]" />
              <span>Civic Intelligence Platform 2026</span>
            </div>

            {/* Bilingual Brand Block */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium font-heading text-[#202124] tracking-tight">
                Civic<span className="text-[#188038]">Resolve</span>
              </h1>

              {/* Subtitles: Always visible in BOTH languages */}
              <div className="space-y-1 pt-1">
                <p className="text-[17px] sm:text-[18px] text-[#5F6368] font-normal leading-snug">
                  Transforming Civic Complaints into Real-World Solutions
                </p>
                <p className="text-[16px] sm:text-[17px] text-[#5F6368] font-tamil font-normal leading-snug">
                  குடிமக்கள் புகார்களை நிஜ உலகத் தீர்வுகளாக மாற்றுதல்
                </p>
              </div>

              <p className="text-sm font-semibold text-[#188038] uppercase tracking-wider pt-1">
                "Your City. Your Voice. Your Impact."
              </p>
              <p className="text-xs text-[#5F6368] italic">
                {t('stepTowardsBetterCity')}
              </p>
            </div>

            {/* Hero Action Headline */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium font-heading text-[#202124] tracking-tight pt-2">
              Report it. Route it. <span className="text-[#188038]">Resolve it.</span>
            </h2>

            <p className="text-base sm:text-lg text-[#5F6368] font-normal leading-relaxed max-w-2xl mx-auto">
              Powered by Google Gemini to transform citizen reports of potholes, broken streetlights, water leaks, and garbage into prioritized municipal action.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {!isAdmin ? (
                <Link
                  to="/report"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-control text-base font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-sm transition-colors"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>{t('reportAnIssue')}</span>
                </Link>
              ) : (
                <Link
                  to="/admin"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-control text-base font-medium text-white bg-[#188038] hover:bg-[#137333] shadow-sm transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>{t('openAdminDashboard')}</span>
                </Link>
              )}
              <Link
                to="/map"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-control text-base font-medium text-[#188038] bg-white hover:bg-[#F1F8F3] border border-[#DADCE0] transition-colors"
              >
                <MapPin className="w-5 h-5 text-[#188038]" />
                <span>{t('exploreMap')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Accent Bar under Hero */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] flex">
          <div className="w-1/4 bg-[#188038]" />
          <div className="w-1/4 bg-[#D93025]" />
          <div className="w-1/4 bg-[#F9AB00]" />
          <div className="w-1/4 bg-[#1E8E3E]" />
        </div>
      </section>

      {/* Live Public Stats Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 sm:p-6 rounded-card bg-white border border-[#DADCE0] shadow-card">
          <div className="flex items-center gap-4 p-2">
            <div className="w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#188038] flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-medium font-mono-numbers text-[#202124]">
                {stats?.total || 15}
              </div>
              <div className="text-xs font-medium text-[#5F6368]">
                Total Complaints
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-2">
            <div className="w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#1E8E3E] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-medium font-mono-numbers text-[#202124]">
                {stats?.resolved || 4}
              </div>
              <div className="text-xs font-medium text-[#5F6368]">
                Issues Resolved ({stats?.resolutionRate || 27}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-2">
            <div className="w-12 h-12 rounded-xl bg-[#FEF7E0] text-[#B06000] flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-medium font-mono-numbers text-[#202124]">
                {stats?.avgResolutionHours || 32}h
              </div>
              <div className="text-xs font-medium text-[#5F6368]">
                Avg Resolution Time
              </div>
            </div>
          </div>

          <Link
            to="/departments"
            className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-[#F8FAF8] hover:shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#188038] focus:ring-offset-2 group cursor-pointer border border-transparent hover:border-[#DADCE0]"
            aria-label="View all 6 active municipal departments directory and live workloads"
          >
            <div className="w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#188038] group-hover:bg-[#188038] group-hover:text-white transition-colors flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-medium font-mono-numbers text-[#202124] group-hover:text-[#188038] transition-colors flex items-center gap-1.5">
                <span>{stats?.activeDepartments || 6}</span>
                <span className="text-xs font-normal text-[#188038] opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
              </div>
              <div className="text-xs font-medium text-[#5F6368] group-hover:text-[#202124] transition-colors">
                Active Departments
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 10-Day Trend Line Chart */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <ChartBoundary title={t('reportedVsResolved')}>
          <TrendLineChart
            data={trendData?.days || []}
            loading={loadingTrends}
            title={t('reportedVsResolved')}
          />
        </ChartBoundary>
      </section>

      {/* How it Works in 3 Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-medium font-heading text-[#202124]">
            How CivicResolve Works
          </h2>
          <p className="text-sm text-[#5F6368] mt-2">
            An end-to-end intelligent pipeline from reporting to municipal resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="p-6 rounded-card bg-white border border-[#DADCE0] shadow-card hover:border-[#188038] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#188038] flex items-center justify-center font-medium text-lg mb-5">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono-numbers font-medium text-[#188038] uppercase tracking-wider">
              Step 01
            </span>
            <h3 className="text-xl font-medium font-heading text-[#202124] mt-1 mb-2">
              Snap & Describe
            </h3>
            <p className="text-sm text-[#5F6368] leading-relaxed">
              Upload a photo or describe the issue. Pinpoint your location on the map, click GPS geolocation, or search a landmark.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-card bg-white border border-[#DADCE0] shadow-card hover:border-[#188038] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#188038] flex items-center justify-center font-medium text-lg mb-5">
              <Cpu className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono-numbers font-medium text-[#188038] uppercase tracking-wider">
              Step 02
            </span>
            <h3 className="text-xl font-medium font-heading text-[#202124] mt-1 mb-2">
              AI Routes & Prioritises
            </h3>
            <p className="text-sm text-[#5F6368] leading-relaxed">
              Google Gemini evaluates the structural damage, calculates a hazard severity score (0-100), and auto-routes directly to the responsible municipal department.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-card bg-white border border-[#DADCE0] shadow-card hover:border-[#188038] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#E6F4EA] text-[#1E8E3E] flex items-center justify-center font-medium text-lg mb-5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono-numbers font-medium text-[#1E8E3E] uppercase tracking-wider">
              Step 03
            </span>
            <h3 className="text-xl font-medium font-heading text-[#202124] mt-1 mb-2">
              Track to Resolution
            </h3>
            <p className="text-sm text-[#5F6368] leading-relaxed">
              Monitor real-time status transitions with transparent audit notes and timestamps. Receive instant alerts when work is completed.
            </p>
          </div>
        </div>
      </section>

      {/* Live Community Feed Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-medium font-heading text-[#202124]">
              Recent High-Priority Reports
            </h2>
            <p className="text-xs text-[#5F6368] mt-1">
              Active civic complaints evaluated by CivicResolve AI across Coimbatore wards.
            </p>
          </div>
          <Link
            to="/map"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#188038] hover:underline"
          >
            <span>View all on live map</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentIssues.map((issue) => (
            <Link
              key={issue.id}
              to={`/issue/${issue.id}`}
              className="group block p-5 rounded-card bg-white border border-[#DADCE0] shadow-card hover:border-[#188038] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-numbers text-xs font-medium text-[#188038]">
                      {issue.id}
                    </span>
                    <span className="text-xs text-[#DADCE0]">•</span>
                    <span className="text-xs text-[#5F6368] truncate max-w-[150px]">
                      {issue.location?.locality || 'Coimbatore'}
                    </span>
                  </div>
                  <h3 className="text-base font-medium text-[#202124] group-hover:text-[#188038] transition-colors line-clamp-1">
                    {issue.title}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <PriorityBadge priority={issue.priority} size="sm" />
                  <StatusChip status={issue.status} size="sm" />
                </div>
              </div>

              <p className="text-xs text-[#5F6368] line-clamp-2 mt-2 leading-relaxed">
                {issue.description}
              </p>

              {issue.status === 'In Progress' && (
                <div className="text-[11px] text-[#188038] font-medium mt-2">
                  Handled by {issue.handledBy?.crew || 'Municipal Repair Crew'} · {issue.location?.locality || 'Coimbatore'}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-[#DADCE0] flex items-center justify-between text-[11px] text-[#5F6368]">
                <span className="truncate max-w-[220px]">
                  Dept: <strong className="font-medium text-[#202124]">{issue.department}</strong>
                </span>
                <span className="text-[#188038] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View Timeline &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
