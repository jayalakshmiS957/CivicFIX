import React from 'react';
import { ShieldCheck, Cpu, MapPin, Users, Award, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Footer() {
  const { isAuthenticated, isAdmin } = useAuth();

  // Minimal footer for logged-out view (no pillars, no quick links, no stats)
  if (!isAuthenticated) {
    return (
      <footer className="bg-[#F1F3F4] border-t border-[#DADCE0] py-4 mt-auto text-center text-xs text-[#5F6368]">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 CivicResolve • "Your City. Your Voice. Your Impact."</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-[#F1F3F4] border-t border-[#DADCE0] transition-colors mt-auto">
      {/* 4 Pillars Section */}
      <div className="border-b border-[#DADCE0] bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E6F4EA] text-[#188038] flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#202124]">AI Intelligence</h4>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Multimodal Gemini reasoning classifies severity, urgency, and routing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E6F4EA] text-[#1E8E3E] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#202124]">Location Intelligence</h4>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  GPS-precise reverse geocoding, pin drop, and interactive municipal maps.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FEF7E0] text-[#B06000] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#202124]">Community Power</h4>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Crowdsourced civic reporting with inline clarifying dialogue.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FCE8E6] text-[#D93025] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#202124]">Accountability</h4>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Transparent public audit timeline from submission to resolution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Problem Statement */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#188038] flex items-center justify-center text-white">
                <Award className="w-4 h-4" />
              </div>
              <span className="font-heading font-medium text-lg text-[#202124]">
                CivicResolve
              </span>
            </div>
            <p className="text-xs font-semibold text-[#188038] uppercase tracking-wider">
              "Your City. Your Voice. Your Impact."
            </p>
            <p className="text-xs text-[#5F6368] leading-relaxed max-w-2xl">
              Citizens report civic issues (potholes, overflowing garbage, damaged streetlights, water leakage, poor roads, drainage). Using Google Gemini, the platform understands the issue, categorises it, identifies urgency, recommends the department, and tracks it from submission to resolution.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-[#202124] mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs text-[#5F6368]">
              <li>
                <Link to="/" className="hover:text-[#188038] transition-colors">Home & Live Stats</Link>
              </li>
              {!isAdmin ? (
                <li>
                  <Link to="/report" className="hover:text-[#188038] transition-colors">Report an Issue (AI Assistant)</Link>
                </li>
              ) : (
                <li>
                  <Link to="/admin" className="hover:text-[#188038] transition-colors">Municipal Command Center</Link>
                </li>
              )}
              <li>
                <Link to="/map" className="hover:text-[#188038] transition-colors">Interactive Civic Map</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#188038] transition-colors">Demo Accounts & Login</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#DADCE0] flex flex-col sm:flex-row items-center justify-between text-xs text-[#5F6368] gap-3">
          <div>
            © 2026 CivicResolve. Coimbatore Municipal Corporation Region.
          </div>
          <div className="flex items-center gap-1">
            <span>Designed with</span>
            <Heart className="w-3.5 h-3.5 text-[#D93025] fill-[#D93025]" />
            <span>for citizen empowerment and municipal excellence.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
