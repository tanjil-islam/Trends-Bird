'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Package, Tags, Bookmark, Users, Activity, ArrowRight, TrendingUp, TrendingDown, MoreHorizontal, Layers, Archive } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8 text-center text-[var(--text-secondary)]">Failed to load dashboard statistics.</div>;
  }

  const { metrics, charts, recentProducts } = stats;
  // Subtle Stripe-like colors
  const COLORS_PRIMARY = ['#18181B', '#71717A', '#D4D4D8', '#F4F4F5'];
  const COLORS_STATUS = ['#166534', '#92400e', '#991b1b']; // Green, Amber, Red

  return (
    <div className="animate-fade-in w-full space-y-8">
      
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>Overview</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Here's what's happening in your catalog today.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 rounded-md shadow-sm">
          <span>Today</span>
          <div className="w-px h-4 bg-[var(--border-color)] mx-1" />
          <span className="text-[var(--text-primary)]">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Top Row: Asymmetrical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Hero Metric */}
        <div className="card lg:col-span-2 relative overflow-hidden flex flex-col justify-between min-h-[220px] p-6 lg:p-8">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-2">
                <Package size={16} />
                <h2 className="text-sm font-semibold tracking-wide uppercase">Total Products</h2>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {metrics.totalProducts}
                </span>
                <span className="flex items-center text-[13px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  <TrendingUp size={14} className="mr-1" /> +12%
                </span>
              </div>
            </div>
            <Link href="/products" className="btn btn-ghost text-xs">
              View Catalog <ArrowRight size={14} />
            </Link>
          </div>
          {/* Faux background chart pattern for visual depth */}
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-zinc-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
        </div>

        {/* Right: Dense Metrics Stack */}
        <div className="lg:col-span-1 grid grid-cols-2 gap-4 lg:grid-cols-1">
          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Categories</p>
              <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>{metrics.totalCategories}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)]">
              <Tags size={16} />
            </div>
          </div>
          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Brands</p>
              <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>{metrics.totalBrands}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)]">
              <Bookmark size={16} />
            </div>
          </div>
          <div className="card p-5 flex items-center justify-between col-span-2 lg:col-span-1">
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Users</p>
              <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>{metrics.totalUsers}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)]">
              <Users size={16} />
            </div>
          </div>
        </div>

      </div>

      {/* Middle Row: New Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Category Distribution Bar Chart */}
        <div className="card lg:col-span-2 flex flex-col p-6">
          <div className="flex items-center gap-2 mb-8">
            <Layers className="text-[var(--text-tertiary)]" size={16} strokeWidth={2.5} />
            <h2 className="text-[13px] font-bold tracking-wider uppercase text-[var(--text-secondary)]">Top Categories</h2>
          </div>
          <div className="flex-1 min-h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.categoryDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="products" fill="#18181B" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Stock Status Donut */}
        <div className="card lg:col-span-1 flex flex-col p-6">
          <div className="flex items-center gap-2 mb-6">
            <Archive className="text-[var(--text-tertiary)]" size={16} strokeWidth={2.5} />
            <h2 className="text-[13px] font-bold tracking-wider uppercase text-[var(--text-secondary)]">Inventory Status</h2>
          </div>
          <div className="flex-1 min-h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.stockStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {charts.stockStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_STATUS[index % COLORS_STATUS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}
                  cursor={{fill: 'transparent'}}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                {charts.stockStatus.reduce((acc: number, curr: any) => acc + curr.value, 0)}
              </span>
              <span className="text-[0.65rem] uppercase tracking-widest text-[var(--text-tertiary)] font-bold">Total</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-between items-center text-xs">
            {charts.stockStatus.map((entry: any, index: number) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS_STATUS[index % COLORS_STATUS.length] }} />
                <span className="text-[var(--text-secondary)] font-medium text-[0.7rem]">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Row: Asymmetrical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Recent Products Table */}
        <div className="card lg:col-span-2 flex flex-col !p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)]">
            <h2 className="text-base font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>Recent Activity</h2>
            <button className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[0.65rem] text-[var(--text-tertiary)] uppercase bg-[var(--bg-primary)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Brand</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {recentProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-[var(--text-secondary)]">No products found.</td>
                  </tr>
                ) : (
                  recentProducts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {p.media?.[0]?.media?.thumbnail || p.media?.[0]?.media?.publicUrl ? (
                            <img src={`http://localhost:4000${p.media[0].media.thumbnail || p.media[0].media.publicUrl}`} className="w-9 h-9 rounded-md object-cover border border-[var(--border-color)]" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-[var(--bg-primary)] flex items-center justify-center border border-[var(--border-color)] text-[var(--text-tertiary)]">
                              <Package size={14} />
                            </div>
                          )}
                          <div>
                            <Link href={`/products/${p.id}`} className="font-semibold text-[var(--text-primary)] group-hover:underline">
                              {p.name}
                            </Link>
                            <div className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-secondary)] font-medium">{p.brand?.name || '-'}</td>
                      <td className="px-5 py-3">
                        <span className={`badge ${p.active ? 'badge-success' : 'badge-neutral'}`}>
                          {p.active ? 'Active' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-secondary)] text-right font-medium">
                        {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-primary)] text-center">
            <Link href="/products" className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              View all products &rarr;
            </Link>
          </div>
        </div>

        {/* Right: Pie Chart */}
        <div className="card lg:col-span-1 flex flex-col p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-[var(--text-tertiary)]" size={16} strokeWidth={2.5} />
            <h2 className="text-[13px] font-bold tracking-wider uppercase text-[var(--text-secondary)]">Catalog Health</h2>
          </div>
          <div className="flex-1 min-h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.productStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {charts.productStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PRIMARY[index % COLORS_PRIMARY.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}
                  cursor={{fill: 'transparent'}}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                {metrics.totalProducts}
              </span>
              <span className="text-[0.65rem] uppercase tracking-widest text-[var(--text-tertiary)] font-bold">Total</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-between items-center text-xs">
            {charts.productStatus.map((entry: any, index: number) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS_PRIMARY[index % COLORS_PRIMARY.length] }} />
                <span className="text-[var(--text-secondary)] font-medium">{entry.name}</span>
                <span className="text-[var(--text-primary)] font-bold ml-1">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
