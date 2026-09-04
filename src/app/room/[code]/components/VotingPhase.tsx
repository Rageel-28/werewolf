'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { submitVoteAction, resolveVotingAction } from '@/app/actions';

export default function VotingPhase({ room, players, currentPlayer, isAdmin }: any) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchVotes = async () => {
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('room_id', room.id)
        .eq('day_count', room.day_count);
      
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(v => {
          if (v.voter_id === currentPlayer?.id) {
            setHasVoted(true);
            setSelectedTarget(v.target_id);
          }
          counts[v.target_id] = (counts[v.target_id] || 0) + 1;
        });
        setVoteCounts(counts);
      }
    };
    if (currentPlayer?.id) fetchVotes();

    const votesSub = supabase
      .channel('votes_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes', filter: `room_id=eq.${room.id}` }, (payload) => {
        setVoteCounts(prev => ({
          ...prev,
          [payload.new.target_id]: (prev[payload.new.target_id] || 0) + 1
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(votesSub);
    };
  }, [room.id, room.day_count, currentPlayer?.id]);

  const handleVote = async () => {
    if (!selectedTarget || !currentPlayer?.is_alive) return;
    setLoading(true);
    
    const res = await submitVoteAction(room.id, room.day_count, currentPlayer.id, selectedTarget);
    if (res?.success) setHasVoted(true);
    
    setLoading(false);
  };

  const handleResolveVoting = async () => {
    setLoading(true);
    await resolveVotingAction(room.id, room.day_count);
    setLoading(false);
  };

  const alivePlayers = players.filter((p: any) => p.is_alive);

  return (
    <>
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
        <div className="h-16 px-gutter-mobile flex items-center justify-between border-b border-error/20">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-error text-[24px]">gavel</span>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md text-error leading-tight">Pengadilan Desa</span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant font-bold">Penentuan Eksekusi</span>
            </div>
          </div>
          <div className="px-2 py-1 bg-error-container/20 border border-error/30 rounded">
             <span className="font-label-sm text-label-sm text-error">Hari Ke-{room.day_count}</span>
          </div>
        </div>
      </header>

      <main className="flex flex-col w-full pt-20 pb-hud-bottom-safe bg-surface min-h-screen relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-error/10 blur-[100px] pointer-events-none"></div>

        <div className="flex flex-col px-gutter-mobile gap-space-lg relative z-10">
          
          <section className="flex flex-col items-center text-center gap-space-sm mt-space-md">
            <div className="relative">
              <div className="absolute inset-0 bg-error/20 blur-xl rounded-full"></div>
              <span className="material-symbols-outlined text-[64px] text-error relative drop-shadow-[0_0_15px_rgba(255,180,171,0.4)] animate-bounce">bloodtype</span>
            </div>
            <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface uppercase tracking-wider">Tiang Gantungan</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">Siapa yang akan menerima murka warga desa hari ini?</p>
          </section>

          {!currentPlayer.is_alive ? (
             <div className="flex flex-col items-center justify-center p-space-xl bg-surface-container-highest rounded-xl border border-surface-container mt-space-md opacity-80">
                <span className="material-symbols-outlined text-[48px] text-outline mb-space-sm">skull</span>
                <h3 className="font-headline-md text-headline-md text-on-surface-variant mb-2">Anda Telah Tiada</h3>
                <p className="font-body-lg text-on-surface-variant text-center">Orang mati tidak memiliki hak suara.</p>
             </div>
          ) : hasVoted ? (
             <div className="flex flex-col items-center justify-center gap-space-md p-space-xl bg-error-container/10 border border-error/30 rounded-xl shadow-inner mt-space-md">
                <div className="w-16 h-16 rounded-full bg-error-container/30 flex items-center justify-center">
                   <span className="material-symbols-outlined text-[32px] text-error">how_to_vote</span>
                </div>
                <div className="text-center">
                   <h3 className="font-headline-md text-headline-md text-error uppercase mb-space-2xs">Suara Terkunci</h3>
                   <p className="font-body-md text-on-surface-variant">Menunggu warga lain menentukan nasib.</p>
                </div>
             </div>
          ) : (
            <section className="flex flex-col gap-space-sm mb-24">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Kandidat Eksekusi</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                {alivePlayers.map((p: any) => {
                  const isMyAlly = ['Werewolf', 'Minion'].includes(currentPlayer?.role) && ['Werewolf', 'Minion'].includes(p.role) && p.id !== currentPlayer?.id;
                  
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedTarget(p.id)}
                      className={`flex flex-col p-space-md rounded-xl transition-all border ${
                        selectedTarget === p.id 
                          ? 'bg-error-container/20 border-error shadow-[0_0_15px_rgba(255,180,171,0.15)]' 
                          : 'bg-surface-container border-surface-container-high hover:bg-surface-container-high'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                         <div className="flex items-center gap-space-sm">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedTarget === p.id ? 'bg-error text-on-error' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                             <span className="material-symbols-outlined text-[20px]">person</span>
                           </div>
                           <div className="flex flex-col items-start">
                             <span className={`font-headline-md text-headline-md ${selectedTarget === p.id ? 'text-error font-bold' : 'text-on-surface'}`}>
                               {p.nickname}
                             </span>
                             {isMyAlly && <span className="font-label-sm text-error/80 uppercase">Sekutu ({p.role})</span>}
                           </div>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedTarget === p.id ? 'border-error bg-error' : 'border-outline-variant'}`}>
                           {selectedTarget === p.id && (
                             <span className="material-symbols-outlined text-on-error text-[16px]">check</span>
                           )}
                         </div>
                      </div>
                    </button>
                  );
                })}

                <button
                  onClick={() => setSelectedTarget('skip')}
                  className={`flex flex-col p-space-md rounded-xl transition-all border mt-space-sm md:mt-0 ${
                    selectedTarget === 'skip' 
                      ? 'bg-secondary-container/20 border-secondary shadow-[0_0_15px_rgba(217,119,7,0.15)]' 
                      : 'bg-surface-container border-surface-container-high hover:bg-surface-container-high'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                     <div className="flex items-center gap-space-sm">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedTarget === 'skip' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-secondary/70'}`}>
                         <span className="material-symbols-outlined text-[20px]">front_hand</span>
                       </div>
                       <span className={`font-headline-md text-headline-md ${selectedTarget === 'skip' ? 'text-secondary font-bold' : 'text-secondary/70'}`}>
                         Lewati (Abstain)
                       </span>
                     </div>
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedTarget === 'skip' ? 'border-secondary bg-secondary' : 'border-outline-variant'}`}>
                       {selectedTarget === 'skip' && (
                         <span className="material-symbols-outlined text-on-secondary text-[16px]">check</span>
                       )}
                     </div>
                  </div>
                </button>
              </div>
            </section>
          )}

          {/* Menampilkan Status Suara Sementara */}
          <section className="flex flex-col gap-space-xs mt-space-md bg-surface-container-low p-space-md rounded-xl border border-surface-container-highest mb-24">
             <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-bold border-b border-surface-container-high pb-2 mb-2">Suara Masuk</span>
             {alivePlayers.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center py-1">
                   <span className="font-body-md text-on-surface">{p.nickname}</span>
                   <div className="flex items-center gap-1">
                      <span className="font-headline-sm text-error font-bold">{voteCounts[p.id] || 0}</span>
                      <span className="font-label-sm text-on-surface-variant uppercase">Suara</span>
                   </div>
                </div>
             ))}
             {(voteCounts['skip'] || 0) > 0 && (
                <div className="flex justify-between items-center py-1 mt-2 border-t border-surface-container-high pt-2">
                   <span className="font-body-md text-secondary">Abstain (Lewati)</span>
                   <div className="flex items-center gap-1">
                      <span className="font-headline-sm text-secondary font-bold">{voteCounts['skip']}</span>
                      <span className="font-label-sm text-on-surface-variant uppercase">Suara</span>
                   </div>
                </div>
             )}
          </section>

          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-surface-container-high mb-32">
              <button
                onClick={handleResolveVoting}
                disabled={loading}
                className="w-full py-3 rounded-lg border border-error/50 text-error hover:bg-error-container/20 font-label-md text-label-md uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {loading ? 'MEMPROSES...' : 'SELESAIKAN SIDANG SEKARANG (ADMIN)'}
              </button>
            </div>
          )}
        </div>
      </main>

      {currentPlayer.is_alive && !hasVoted && (
        <div className="fixed bottom-0 left-0 w-full p-gutter-mobile pb-safe bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/90 to-transparent z-40">
          <button 
            onClick={handleVote}
            disabled={!selectedTarget || loading}
            className="w-full h-14 rounded-full bg-error hover:bg-error/90 text-on-error font-headline-md text-headline-md tracking-wider flex items-center justify-center gap-space-sm shadow-[0_4px_20px_rgba(255,180,171,0.3)] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:shadow-none"
          >
            <span className="material-symbols-outlined text-[24px]">gavel</span>
            {loading ? 'MENYEGEL...' : 'KUNCI PILIHAN'}
          </button>
        </div>
      )}
    </>
  );
}
