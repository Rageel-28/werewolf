'use client';

import { useState } from 'react';
import { startGameAction } from '@/app/actions';

const AVAILABLE_ROLES = [
  { id: 'Werewolf', name: 'Werewolf', type: 'bad', icon: 'pets' },
  { id: 'Seer', name: 'Seer', type: 'good', icon: 'visibility' },
  { id: 'Guardian', name: 'Guardian', type: 'good', icon: 'shield' },
  { id: 'Hunter', name: 'Hunter', type: 'good', icon: 'my_location' },
  { id: 'Minion', name: 'Minion', type: 'bad', icon: 'theater_comedy' },
  { id: 'Fool', name: 'Fool', type: 'solo', icon: 'person_cancel' },
  { id: 'Villager', name: 'Villager', type: 'good', icon: 'person' },
];

export default function Lobby({ room, players, currentPlayer, isAdmin }: any) {
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({
    Werewolf: 1,
    Seer: 1,
    Guardian: 0,
    Hunter: 0,
    Minion: 0,
    Fool: 0,
    Villager: Math.max(0, players.length - 2)
  });
  const [loading, setLoading] = useState(false);

  const totalRoles = Object.values(roleCounts).reduce((a, b) => a + b, 0);
  const isValid = totalRoles === players.length && players.length >= 3;

  const updateRole = (roleId: string, delta: number) => {
    setRoleCounts(prev => {
      const current = prev[roleId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [roleId]: next };
    });
  };

  const handleStart = async () => {
    if (!isValid || !isAdmin) return;
    setLoading(true);
    
    const selectedRoles: string[] = [];
    Object.entries(roleCounts).forEach(([role, count]) => {
      for (let i = 0; i < count; i++) {
        selectedRoles.push(role);
      }
    });

    await startGameAction(room.id, selectedRoles);
    setLoading(false);
  };

  return (
    <>
      {/* Header Info Bar */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
        <div className="h-16 px-gutter-mobile flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-secondary text-[24px]">stadium</span>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md text-on-surface leading-tight">Kastil Ravenloft</span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold">Ruang Perjamuan</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col w-full pt-16 pb-hud-bottom-safe bg-surface min-h-screen">
        <div className="flex flex-col px-gutter-mobile gap-space-lg pt-space-md">
          
          {/* Status dan Kode Ruang */}
          <section className="flex flex-col items-center gap-space-sm">
            <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-bold">
              MENUNGGU PEMAIN ({players.length}/15)
            </span>
            <div className="px-space-lg py-space-xs rounded-full bg-surface-container-high border border-outline-variant shadow-md flex items-center gap-space-sm">
              <span className="font-headline-2xl-mobile text-headline-2xl-mobile text-primary tracking-[0.2em]">{room.room_code}</span>
              <button className="text-secondary hover:text-secondary-fixed active:scale-95 transition-transform" title="Salin Kode">
                <span className="material-symbols-outlined text-[24px]">content_copy</span>
              </button>
            </div>
          </section>

          {/* Daftar Pemain */}
          <section className="grid grid-cols-3 gap-space-sm">
            {players.map((p: any) => (
              <div key={p.id} className={`flex flex-col items-center gap-space-2xs p-space-sm rounded-lg border bg-surface-container shadow-sm ${p.id === currentPlayer.id ? 'border-primary ring-1 ring-primary/50' : 'border-surface-container-high'}`}>
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant mb-1 shadow-inner overflow-hidden">
                    <span className="material-symbols-outlined text-[32px] opacity-70">account_circle</span>
                  </div>
                  {room.admin_id === p.session_token && (
                    <div className="absolute -top-2 -right-2 bg-secondary text-on-secondary rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-[14px]">crown</span>
                    </div>
                  )}
                </div>
                <span className="font-label-sm text-label-sm text-on-surface font-bold text-center w-full truncate px-1">{p.nickname}</span>
              </div>
            ))}
            
            {players.length < 15 && (
              <div className="flex flex-col items-center justify-center gap-space-2xs p-space-sm rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest opacity-50">
                <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-outline mb-1">
                  <span className="material-symbols-outlined text-[24px]">hourglass_empty</span>
                </div>
                <span className="font-label-sm text-label-sm text-outline font-bold">KOSONG</span>
              </div>
            )}
          </section>

          {/* Panel Admin: Pengaturan Peran */}
          {isAdmin ? (
            <section className="flex flex-col gap-space-md mb-24">
              <div className="flex items-center gap-space-sm border-b border-surface-container-high pb-space-xs">
                <span className="material-symbols-outlined text-secondary text-[24px]">admin_panel_settings</span>
                <span className="font-headline-md text-headline-md text-on-surface">Distribusi Peran</span>
              </div>
              
              <div className="flex flex-col gap-space-xs">
                {AVAILABLE_ROLES.map(role => (
                  <div key={role.id} className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container border border-surface-container-high shadow-sm">
                    <div className="flex items-center gap-space-sm">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.type === 'bad' ? 'bg-error-container/20 text-error' : role.type === 'solo' ? 'bg-secondary-container/20 text-secondary' : 'bg-primary-container/20 text-primary'}`}>
                        <span className="material-symbols-outlined text-[20px]">{role.icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-bold">{role.name}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">{role.type}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-space-sm bg-surface-container-highest rounded-full px-2 py-1">
                      <button 
                        onClick={() => updateRole(role.id, -1)}
                        className="w-8 h-8 rounded-full bg-surface hover:bg-surface-dim text-on-surface-variant flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <span className="font-headline-md text-headline-md text-on-surface min-w-[24px] text-center">
                        {roleCounts[role.id] || 0}
                      </span>
                      <button 
                        onClick={() => updateRole(role.id, 1)}
                        className="w-8 h-8 rounded-full bg-primary hover:bg-primary-fixed-dim text-on-primary flex items-center justify-center active:scale-95 shadow-md transition-transform"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center p-space-sm rounded-lg bg-surface-container-low border border-surface-container-high mt-space-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Total Peran Dipilih</span>
                <span className={`font-headline-lg text-headline-lg ${totalRoles === players.length ? 'text-primary' : 'text-error'}`}>
                  {totalRoles} <span className="text-on-surface-variant text-lg">/ {players.length}</span>
                </span>
              </div>
              
              {players.length < 3 ? (
                <div className="text-center text-error font-body-sm bg-error-container/20 p-2 rounded">Minimal butuh 3 pemain untuk memulai.</div>
              ) : !isValid ? (
                <div className="text-center text-error font-body-sm bg-error-container/20 p-2 rounded">Jumlah peran harus sama dengan jumlah pemain.</div>
              ) : null}
            </section>
          ) : (
            <section className="flex flex-col gap-space-md items-center justify-center py-12 mt-12 mb-24 opacity-60">
              <span className="material-symbols-outlined text-[64px] text-on-surface-variant mb-4 animate-pulse">hourglass_top</span>
              <p className="font-body-lg text-center text-on-surface-variant px-8">Menunggu Host mengatur peran dan memulai permainan...</p>
            </section>
          )}
        </div>
      </main>

      {/* Floating Action Area for Host */}
      {isAdmin && (
        <div className="fixed bottom-0 left-0 w-full p-gutter-mobile pb-safe bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/90 to-transparent z-40">
          <button 
            onClick={handleStart}
            disabled={!isValid || loading}
            className="w-full h-14 rounded-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-headline-md text-headline-md tracking-wider flex items-center justify-center gap-space-sm shadow-[0_4px_20px_rgba(208,188,255,0.4)] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:shadow-none"
          >
            <span className="material-symbols-outlined text-[24px]">swords</span>
            {loading ? 'MEMULAI...' : 'MULAI PERMAINAN'}
          </button>
        </div>
      )}
    </>
  );
}
