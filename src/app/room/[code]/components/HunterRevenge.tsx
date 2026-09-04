'use client';

import { useState } from 'react';
import { submitHunterRevengeAction, skipHunterRevengeAction } from '@/app/actions';

export default function HunterRevenge({ room, players, currentPlayer, isAdmin }: any) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isHunter = currentPlayer?.role === 'Hunter';
  const alivePlayers = players.filter((p: any) => p.is_alive && p.id !== currentPlayer?.id);

  const handleShoot = async () => {
    if (!selectedTarget || !isHunter) return;
    setLoading(true);
    await submitHunterRevengeAction(room.id, currentPlayer.id, selectedTarget);
    setLoading(false);
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(255,0,0,0.3)]">
        <div className="h-16 px-gutter-mobile flex items-center justify-between border-b border-error/50">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-error text-[28px] animate-pulse">crisis_alert</span>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md text-error leading-tight">Peran: {currentPlayer?.role}</span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant font-bold">{currentPlayer?.nickname}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col w-full pt-20 pb-hud-bottom-safe bg-surface min-h-screen relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-error/20 blur-[120px] pointer-events-none"></div>

        <div className="flex flex-col px-gutter-mobile gap-space-lg relative z-10 mt-space-md">
          
          <section className="flex flex-col items-center text-center gap-space-sm">
            <div className="relative">
              <div className="absolute inset-0 bg-error/40 blur-xl rounded-full"></div>
              <span className="material-symbols-outlined text-[80px] text-error relative drop-shadow-[0_0_20px_rgba(255,84,74,0.6)] animate-pulse">my_location</span>
            </div>
            <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface uppercase tracking-wider drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
              Pembalasan Sang Pemburu!
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
              Sang Pemburu (<strong className="text-error">Hunter</strong>) telah terbunuh! Dalam nafas terakhirnya, senjatanya masih terisi satu peluru mematikan.
            </p>
          </section>

          {isHunter ? (
            <section className="flex flex-col gap-space-sm mb-24">
              <div className="p-space-sm bg-error-container/20 border border-error/40 rounded-lg text-center mb-space-xs shadow-inner">
                <span className="font-label-md text-label-md text-error uppercase tracking-wider font-bold">Pilih Satu Korban Untuk Menemanimu Ke Neraka!</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                {alivePlayers.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedTarget(p.id)}
                    className={`flex items-center justify-between p-space-md rounded-xl transition-all border ${
                      selectedTarget === p.id 
                        ? 'bg-error text-on-error shadow-[0_0_25px_rgba(255,0,0,0.4)]' 
                        : 'bg-surface-container border-surface-container-high hover:bg-surface-container-highest hover:border-error/50 text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedTarget === p.id ? 'bg-on-error/20' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-[24px]">target</span>
                      </div>
                      <span className={`font-headline-md text-headline-md ${selectedTarget === p.id ? 'font-bold' : ''}`}>
                        {p.nickname}
                      </span>
                    </div>
                    {selectedTarget === p.id && (
                      <span className="material-symbols-outlined text-[28px] animate-pulse">crisis_alert</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="flex flex-col items-center justify-center p-space-2xl bg-surface-container rounded-xl border border-error/30 mt-space-lg shadow-inner">
               <span className="material-symbols-outlined text-[64px] text-error mb-space-sm animate-spin-slow">radar</span>
               <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Sedang Membidik...</h3>
               <p className="font-body-lg text-on-surface-variant text-center max-w-sm">
                 Tiarap! Sang Pemburu sedang memilih target tembakan membabi butanya! Berdoalah bukan namamu yang disebut.
               </p>
            </section>
          )}

          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-error/30 mb-32 flex justify-center">
              <button
                onClick={async () => {
                   setLoading(true);
                   await skipHunterRevengeAction(room.id);
                   setLoading(false);
                }}
                disabled={loading}
                className="w-full py-3 rounded-lg border border-error/50 text-error hover:bg-error-container/20 font-label-md text-label-md uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {loading ? 'MEMPROSES...' : 'LEWATI KEMATIAN PEMBURU (ADMIN)'}
              </button>
            </div>
          )}

        </div>
      </main>

      {isHunter && (
        <div className="fixed bottom-0 left-0 w-full p-gutter-mobile pb-safe bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/90 to-transparent z-40">
          <button 
            onClick={handleShoot}
            disabled={!selectedTarget || loading}
            className="w-full h-16 rounded-full bg-error hover:bg-[#b91c1c] text-on-error font-headline-lg text-headline-lg tracking-wider flex items-center justify-center gap-space-sm shadow-[0_4px_30px_rgba(255,0,0,0.6)] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:shadow-none"
          >
            <span className="material-symbols-outlined text-[28px]">explosion</span>
            {loading ? 'MENEMBAK...' : 'TARIK PELATUK'}
          </button>
        </div>
      )}
    </>
  );
}
