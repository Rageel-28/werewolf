'use client';

import { useState, useEffect, useRef } from 'react';
import { submitNightAction, resolveNightAction } from '@/app/actions';
import { supabase } from '@/lib/supabase';

const ROLE_INFO: Record<string, { desc: string, icon: string, actionName: string }> = {
  Werewolf: { desc: 'Pilih mangsa untuk malam ini.', icon: 'pets', actionName: 'Tentukan Mangsa' },
  Seer: { desc: 'Terawang rahasia satu jiwa malam ini.', icon: 'visibility', actionName: 'Terawang' },
  Guardian: { desc: 'Lindungi satu penduduk dari ancaman.', icon: 'shield', actionName: 'Lindungi' },
  Hunter: { desc: 'Genggam senjatamu, bersiaplah untuk yang terburuk.', icon: 'my_location', actionName: '' },
  Minion: { desc: 'Berdoalah untuk Tuan Werewolf-mu.', icon: 'theater_comedy', actionName: '' },
  Fool: { desc: 'Tidurlah. Rencanakan kebohonganmu besok.', icon: 'person_cancel', actionName: '' },
  Villager: { desc: 'Tidurlah dan berharap melihat matahari besok.', icon: 'bedtime', actionName: '' },
};

export default function NightPhase({ room, players, currentPlayer, isAdmin }: any) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seerResult, setSeerResult] = useState<string | null>(null);
  const [submittedActorIds, setSubmittedActorIds] = useState<string[]>([]);
  const [optimisticActed, setOptimisticActed] = useState(false);
  const [seerReadyToSubmit, setSeerReadyToSubmit] = useState(false);
  const resolvingRef = useRef(false);

  const role = currentPlayer?.role;
  const info = ROLE_INFO[role] || ROLE_INFO['Villager'];
  const isActiveRole = ['Werewolf', 'Seer', 'Guardian'].includes(role);
  const alivePlayers = players.filter((p: any) => p.is_alive);
  
  const hasActed = submittedActorIds.includes(currentPlayer?.id) || optimisticActed;

  const TURN_ORDER = ['Seer', 'Guardian', 'Werewolf'];
  let currentTurnRole: string | null = null;
  
  for (const turnRole of TURN_ORDER) {
    const rolePlayers = alivePlayers.filter((p: any) => p.role === turnRole);
    if (rolePlayers.length > 0) {
      const allActed = rolePlayers.every((p: any) => submittedActorIds.includes(p.id));
      if (!allActed) {
        currentTurnRole = turnRole;
        break; 
      }
    }
  }

  const isMyTurn = currentTurnRole === role;

  const translateRole = (r: string | null) => {
    if (r === 'Werewolf') return 'Werewolf';
    if (r === 'Seer') return 'Penerawang';
    if (r === 'Guardian') return 'Pelindung';
    return r;
  }

  useEffect(() => {
    resolvingRef.current = false;
    const fetchActions = async () => {
      const { data } = await supabase
        .from('night_actions')
        .select('actor_id, target_id')
        .eq('room_id', room.id)
        .eq('day_count', room.day_count);
        
      if (data) {
        setSubmittedActorIds(data.map(d => d.actor_id));
        
        // Recover Seer result on refresh
        if (role === 'Seer') {
           const myAction = data.find(d => d.actor_id === currentPlayer.id);
           if (myAction && myAction.target_id) {
              const target = players.find((p: any) => p.id === myAction.target_id);
              if (target) {
                 const isBad = target.role === 'Werewolf';
                 setSeerResult(`${target.nickname} ${isBad ? 'adalah Werewolf!' : 'bukan Werewolf.'}`);
              }
           }
        }
      }
    };
    fetchActions();

    const sub = supabase.channel(`night_actions_updates_${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'night_actions', filter: `room_id=eq.${room.id}` }, (payload) => {
         setSubmittedActorIds(prev => [...prev, payload.new.actor_id]);
      })
      .subscribe();
      
    // FALLBACK POLLING
    const pollInterval = setInterval(() => {
       fetchActions();
    }, 3000);
      
    return () => { 
       supabase.removeChannel(sub); 
       clearInterval(pollInterval);
    };
  }, [room.id, room.day_count]);

  useEffect(() => {
    if (!isAdmin) return;
    const activeAlivePlayersCount = players.filter((p: any) => p.is_alive && ['Werewolf', 'Seer', 'Guardian'].includes(p.role)).length;
    const uniqueActors = new Set(submittedActorIds);
    
    if ((uniqueActors.size >= activeAlivePlayersCount || activeAlivePlayersCount === 0) && !resolvingRef.current) {
       resolvingRef.current = true;
       handleResolveNight();
    }
  }, [isAdmin, submittedActorIds, players]);

  const handleAction = async (targetOverride?: string) => {
    // If it's a string, use it. If it's an event object from onClick, ignore it.
    const target = typeof targetOverride === 'string' ? targetOverride : selectedTarget;
    if (!target) return;
    
    // For Seer, show result first, require second click to submit
    if (role === 'Seer' && !seerReadyToSubmit) {
      const pTarget = players.find((p: any) => p.id === target);
      if (pTarget) {
         const isBad = pTarget.role === 'Werewolf';
         setSeerResult(`${pTarget.nickname} ${isBad ? 'adalah Werewolf!' : 'bukan Werewolf.'}`);
         setSeerReadyToSubmit(true);
      }
      return;
    }

    setLoading(true);

    // Set optimistic state immediately to prevent polling race conditions
    setOptimisticActed(true);

    await submitNightAction(room.id, room.day_count, currentPlayer.id, target, role.toLowerCase());
    
    // Optimistic UI Update for array
    setSubmittedActorIds(prev => {
       if (!prev.includes(currentPlayer.id)) {
          return [...prev, currentPlayer.id];
       }
       return prev;
    });
    
    setLoading(false);
  };

  const handleResolveNight = async () => {
    setLoading(true);
    await resolveNightAction(room.id, room.day_count);
    setLoading(false);
  };

  return (
    <>
      {/* Header Faksi & Identitas */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
        <div className="h-16 px-gutter-mobile flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className={`material-symbols-outlined text-[24px] ${role === 'Werewolf' || role === 'Minion' ? 'text-error' : 'text-primary'}`}>
              {info.icon}
            </span>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md text-on-surface leading-tight">Peran: {role}</span>
              <span className={`font-label-sm text-label-sm uppercase tracking-widest font-bold ${role === 'Werewolf' || role === 'Minion' ? 'text-error' : 'text-primary'}`}>
                {currentPlayer?.nickname}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <div className="px-2 py-1 bg-surface-container-high rounded border border-surface-container-highest">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Malam Ke-{room.day_count}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col w-full pt-20 pb-hud-bottom-safe bg-surface min-h-screen relative overflow-hidden">
        {/* Latar Belakang Mistis */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary-container/10 blur-[100px] pointer-events-none"></div>

        <div className="flex flex-col px-gutter-mobile gap-space-lg relative z-10">
          
          <section className="flex flex-col items-center text-center gap-space-sm">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <span className="material-symbols-outlined text-[64px] text-primary relative drop-shadow-[0_0_15px_rgba(208,188,255,0.4)] animate-pulse">nightlight</span>
            </div>
            <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface uppercase tracking-wider">{info.actionName || 'Tidur Pulas'}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">{info.desc}</p>
          </section>

          {/* Rahasia Kelompok Jahat */}
          {['Werewolf', 'Minion'].includes(role) && (
            <section className="p-space-sm bg-error-container/10 border border-error/30 rounded-lg shadow-inner">
              <div className="flex items-center gap-space-2xs mb-space-xs">
                <span className="material-symbols-outlined text-[16px] text-error">visibility</span>
                <span className="font-label-md text-label-md text-error font-bold uppercase tracking-wider">Tabir Kesesatan</span>
              </div>
              <ul className="flex flex-col gap-1 font-body-sm text-body-sm text-on-surface">
                {players.filter((p: any) => p.role === 'Werewolf' && p.id !== currentPlayer.id).length > 0 && (
                   <li>Rekan Werewolf: <span className="font-bold text-error">{players.filter((p: any) => p.role === 'Werewolf' && p.id !== currentPlayer.id).map((p: any) => p.nickname).join(', ')}</span></li>
                )}
                {role === 'Minion' && players.filter((p: any) => p.role === 'Werewolf').length > 0 && (
                   <li>Tuan Werewolf: <span className="font-bold text-error">{players.filter((p: any) => p.role === 'Werewolf').map((p: any) => p.nickname).join(', ')}</span></li>
                )}
                {role === 'Werewolf' && players.filter((p: any) => p.role === 'Minion').length > 0 && (
                   <li>Budak Minion: <span className="font-bold text-error">{players.filter((p: any) => p.role === 'Minion').map((p: any) => p.nickname).join(', ')}</span></li>
                )}
                {role === 'Minion' && players.filter((p: any) => p.role === 'Minion' && p.id !== currentPlayer.id).length > 0 && (
                   <li>Rekan Minion: <span className="font-bold text-error">{players.filter((p: any) => p.role === 'Minion' && p.id !== currentPlayer.id).map((p: any) => p.nickname).join(', ')}</span></li>
                )}
                {players.filter((p: any) => ['Werewolf', 'Minion'].includes(p.role) && p.id !== currentPlayer.id).length === 0 && (
                   <li>Anda berjuang sendirian.</li>
                )}
              </ul>
            </section>
          )}

          {/* Ritual Interaktif */}
          {!currentPlayer.is_alive ? (
            <div className="flex flex-col items-center justify-center p-space-xl bg-surface-container-highest rounded-xl border border-surface-container mt-space-md opacity-80">
              <span className="material-symbols-outlined text-[48px] text-outline mb-space-sm">skull</span>
              <p className="font-body-lg text-on-surface-variant text-center">Anda telah tiada dari dunia ini. Saksikan sisa malam dalam keheningan.</p>
              {currentTurnRole && (
                <p className="font-label-sm text-outline mt-4">Ritual Sedang Berjalan: {translateRole(currentTurnRole)}</p>
              )}
            </div>
          ) : hasActed ? (
            <div className="flex flex-col items-center justify-center gap-space-md p-space-xl bg-primary-container/10 border border-primary/20 rounded-xl mt-space-md shadow-[0_0_30px_rgba(208,188,255,0.05)]">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px] text-primary">check_circle</span>
              </div>
              <div className="text-center">
                <h3 className="font-headline-md text-headline-md text-primary uppercase mb-space-2xs">Ritual Selesai</h3>
                <p className="font-body-md text-on-surface-variant">Menunggu pihak lain menuntaskan tugas mereka di kegelapan.</p>
              </div>
              
              {seerResult && (
                <div className="w-full mt-space-sm p-space-md bg-surface-container rounded-lg border border-primary-container text-center shadow-inner">
                   <span className="material-symbols-outlined text-[24px] text-primary mb-2">visibility</span>
                   <p className="font-body-lg text-on-surface">{seerResult}</p>
                </div>
              )}
            </div>
          ) : !isActiveRole ? (
            <div className="flex flex-col items-center justify-center gap-space-sm p-space-xl bg-surface-container rounded-xl border border-surface-container-highest mt-space-md">
              <span className="material-symbols-outlined text-[48px] text-secondary mb-2 animate-pulse">bedtime</span>
              <p className="font-body-lg text-on-surface-variant text-center">Pejamkan mata Anda dan biarkan malam berlalu.</p>
              {currentTurnRole && (
                <p className="font-label-sm text-outline mt-2 tracking-widest uppercase">Berlangsung: {translateRole(currentTurnRole)}</p>
              )}
            </div>
          ) : !isMyTurn ? (
            <div className="flex flex-col items-center justify-center gap-space-sm p-space-xl bg-surface-container rounded-xl border border-surface-container-highest mt-space-md">
              <span className="material-symbols-outlined text-[48px] text-secondary mb-2 animate-pulse">hourglass_top</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Tetap Dalam Bayangan</h3>
              <p className="font-body-md text-on-surface-variant text-center">Sekarang adalah giliran <strong>{translateRole(currentTurnRole)}</strong>. Bersabarlah.</p>
            </div>
          ) : role === 'Werewolf' && room.day_count === 1 ? (
             <div className="flex flex-col items-center justify-center p-space-xl bg-error-container/20 border border-error/30 rounded-xl mt-space-md">
                <span className="material-symbols-outlined text-[48px] text-error mb-space-sm">gavel</span>
                <h3 className="font-headline-md text-headline-md text-error uppercase mb-2">Malam Pertama</h3>
                <p className="font-body-md text-on-surface-variant text-center mb-space-md">Manusia Serigala belum lapar. Tidak ada darah yang tumpah malam ini.</p>
                <button
                  onClick={() => handleAction('skip')}
                  disabled={loading || optimisticActed}
                  className="px-space-xl py-space-sm rounded-full bg-error text-on-error font-label-md text-label-md uppercase tracking-wider active:scale-95 transition-transform"
                >
                  Lewati Malam
                </button>
             </div>
          ) : (
            <section className="flex flex-col gap-space-sm mb-24">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Daftar Jiwa (Pilih Satu)</span>
              
              {role === 'Seer' && seerResult && !hasActed && (
                <div className="w-full mb-space-sm p-space-md bg-primary-container/20 border border-primary/30 rounded-xl text-center shadow-[0_0_15px_rgba(208,188,255,0.1)]">
                   <span className="material-symbols-outlined text-[32px] text-primary mb-2 animate-pulse">visibility</span>
                   <h3 className="font-headline-sm text-headline-sm text-primary mb-1">Hasil Terawangan</h3>
                   <p className="font-body-lg text-on-surface">{seerResult}</p>
                </div>
              )}

              <div className={`flex flex-col gap-space-xs ${seerReadyToSubmit ? 'opacity-50 pointer-events-none' : ''}`}>
                {alivePlayers.filter((p: any) => p.id !== currentPlayer.id || role === 'Guardian').map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedTarget(p.id)}
                    className={`flex items-center justify-between p-space-md rounded-xl transition-all border ${
                      selectedTarget === p.id 
                        ? 'bg-primary-container/20 border-primary shadow-[0_0_15px_rgba(208,188,255,0.15)]' 
                        : 'bg-surface-container border-surface-container-high hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedTarget === p.id ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-[20px]">person</span>
                      </div>
                      <span className={`font-headline-md text-headline-md ${selectedTarget === p.id ? 'text-primary font-bold' : 'text-on-surface'}`}>
                        {p.nickname}
                      </span>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedTarget === p.id ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                      {selectedTarget === p.id && (
                        <span className="material-symbols-outlined text-on-primary text-[16px]">check</span>
                      )}
                    </div>
                  </button>
                ))}
                
                {role === 'Werewolf' && (
                  <button
                    onClick={() => setSelectedTarget('skip')}
                    className={`flex items-center justify-between p-space-md rounded-xl transition-all border mt-space-sm ${
                      selectedTarget === 'skip' 
                        ? 'bg-error-container/20 border-error shadow-[0_0_15px_rgba(255,180,171,0.15)]' 
                        : 'bg-surface-container border-surface-container-high hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedTarget === 'skip' ? 'bg-error text-on-error' : 'bg-surface-container-highest text-error/70'}`}>
                        <span className="material-symbols-outlined text-[20px]">block</span>
                      </div>
                      <span className={`font-headline-md text-headline-md ${selectedTarget === 'skip' ? 'text-error font-bold' : 'text-error/70'}`}>
                        Lewati Mangsa
                      </span>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedTarget === 'skip' ? 'border-error bg-error' : 'border-outline-variant'}`}>
                      {selectedTarget === 'skip' && (
                        <span className="material-symbols-outlined text-on-error text-[16px]">check</span>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </section>
          )}

          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-surface-container-high mb-24">
              <button
                onClick={handleResolveNight}
                disabled={loading}
                className="w-full py-3 rounded-lg border border-error text-error hover:bg-error/10 font-label-md text-label-md uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {loading ? 'MEMPROSES...' : 'LEWATI MALAM (ADMIN)'}
              </button>
            </div>
          )}

        </div>
      </main>

      {/* Floating Action Button */}
      {isActiveRole && !hasActed && isMyTurn && currentPlayer.is_alive && (
        <div className="fixed bottom-0 left-0 w-full p-gutter-mobile pb-safe bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/90 to-transparent z-40">
          <button 
            onClick={() => handleAction()}
            disabled={!selectedTarget || loading}
            className="w-full h-14 rounded-full bg-primary hover:bg-primary-fixed-dim text-on-primary font-headline-md text-headline-md tracking-wider flex items-center justify-center gap-space-sm shadow-[0_4px_20px_rgba(208,188,255,0.4)] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:shadow-none"
          >
            <span className="material-symbols-outlined text-[24px]">verified</span>
            {loading ? 'MENYELAIKAN...' : seerReadyToSubmit ? 'TUTUP & SELANJUTNYA' : 'KONFIRMASI RITUAL'}
          </button>
        </div>
      )}
    </>
  );
}
