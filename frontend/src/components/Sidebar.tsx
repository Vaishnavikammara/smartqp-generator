import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  Files,
  BookOpen,
  Sparkles
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/create-paper', label: 'Create New Paper', icon: FilePlus, highlight: true },
    { to: '/papers', label: 'My Question Papers', icon: Files },
    { to: '/course-plans', label: 'Saved Course Plans', icon: BookOpen },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                        : item.highlight
                        ? 'text-indigo-600 hover:bg-indigo-50/50'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Feature Highlights card */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 rounded-2xl p-4 border border-indigo-100/80">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
            <Sparkles className="w-4 h-4" />
            <span>SmartQP AI Engine</span>
          </div>
          <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed">
            Multi-set non-repetition with semantic cosine similarity, syllabus grounding, and automated rule validation.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
        SmartQP v1.0 • Academic Edition
      </div>
    </aside>
  );
};
