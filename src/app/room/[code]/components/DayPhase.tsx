'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { startVotingAction, sendChatAction, startTimerAction } from '@/app/actions';

export default function DayPhase({ room, players, currentPlayer, isAdmin }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(3);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Custom effect to remove dark mode for Day Phase (if needed)
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    return () => {
      document.documentElement.classList.add('dark');
    };
  }, []);

  useEffect(() => {
    const fetchChats = async () => {
      const { data } = await supabase
        .from('chats')
        .select('*, players(nickname)')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchChats();

    const chatSub = supabase
      .channel(`chat_updates_${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats', filter: `room_id=eq.${room.id}` }, async (payload) => {
        if (payload.new.player_id) {
           const { data: player } = await supabase.from('players').select('nickname').eq('id', payload.new.player_id).single();
           setMessages(prev => [...prev, { ...payload.new, players: player }]);
        } else {
           setMessages(prev => [...prev, payload.new]);
        }
      })
      .subscribe();
      
    // FALLBACK POLLING
    const pollInterval = setInterval(() => {
       fetchChats();
    }, 3000);

    return () => { 
       supabase.removeChannel(chatSub); 
       clearInterval(pollInterval);
    };
  }, [room.id, room.day_count]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!room.timer_ends_at) {
      setTimeLeft(null);
      return;
    }
    
    const interval = setInterval(() => {
      const remaining = new Date(room.timer_ends_at).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(Math.floor(remaining / 1000));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [room.timer_ends_at]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentPlayer.is_alive) return;
    
    await sendChatAction(room.id, currentPlayer.id, newMessage);
    setNewMessage('');
  };

  const handleStartVoting = async () => {
    setLoading(true);
    await startVotingAction(room.id);
    setLoading(false);
  };

  const handleStartTimer = async () => {
    setLoading(true);
    await startTimerAction(room.id, timerMinutes);
    setLoading(false);
  };

  const alivePlayers = players.filter((p: any) => p.is_alive);
  const deadPlayers = players.filter((p: any) => !p.is_alive);

  return (
    <div className="bg-[#fdfbf7] text-on-surface flex flex-col min-h-screen">
      {/* Header Cerah */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-[#fdfbf7]/90 backdrop-blur-xl border-b border-[#e7e0d3] shadow-sm">
        <div className="h-16 px-gutter-mobile flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[#d97707] text-[28px] animate-[spin_10s_linear_infinite]">light_mode</span>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md text-[#2f1500] leading-tight">Peran: {currentPlayer?.role}</span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-[#6e3900] font-bold">{currentPlayer?.nickname}</span>
            </div>
          </div>
          <div className="px-3 py-1 bg-white border border-[#e7e0d3] rounded shadow-sm">
            <span className="font-label-sm text-label-sm text-[#432100]">Hari Ke-{room.day_count}</span>
          </div>
        </div>
      </header>

      <main className="flex flex-col w-full pt-24 pb-hud-bottom-safe min-h-screen relative overflow-x-hidden">
        
        {/* Dekorasi Cahaya Pagi */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#fff3cd] to-transparent rounded-full blur-[80px] pointer-events-none -z-10"></div>
        
        <div className="flex flex-col px-gutter-mobile gap-space-lg relative z-10 w-full max-w-4xl mx-auto">

          {/* Panel Timer & Status */}
          <section className="flex flex-col gap-space-xs p-space-md bg-white border border-[#e7e0d3] rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs text-[#2f1500]">
                <span className="material-symbols-outlined text-[20px]">timer</span>
                <span className="font-label-md text-label-md uppercase tracking-wider font-bold">Waktu Musyawarah</span>
              </div>
              {room.timer_ends_at && timeLeft !== null && (
                <span className={`font-headline-lg text-headline-lg ${timeLeft <= 30 ? 'text-[#e11d48] animate-pulse' : 'text-[#d97707]'}`}>
                  {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
            
            <p className="font-body-md text-body-md text-[#6e3900]">Diskusikan dengan penduduk lain siapa yang mencurigakan, atau bersiaplah untuk memberikan suara.</p>
            
            {isAdmin && !room.timer_ends_at && (
               <div className="flex gap-2 mt-2">
                 <input
                    type="number"
                    min="1"
                    max="15"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 1)}
                    className="w-20 p-2 rounded-lg border border-orange-200 text-center bg-white"
                 />
                 <button
                    onClick={handleStartTimer}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-[#d97707] hover:bg-[#b45309] text-white font-bold transition-all"
                 >
                    Set Timer
                 </button>
               </div>
            )}
          </section>

          {/* Daftar Korban Malam Tadi */}
          {deadPlayers.length > 0 && (
            <section className="flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs border-b border-[#e7e0d3] pb-1">
                <span className="material-symbols-outlined text-[#e11d48] text-[20px]">skull</span>
                <span className="font-label-md text-label-md text-[#e11d48] uppercase tracking-wider font-bold">Korban Gugur Malam Ini</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-space-xs">
                {deadPlayers.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-space-xs p-space-xs rounded bg-[#ffe4e6] border border-[#fecdd3]">
                    <span className="material-symbols-outlined text-[#e11d48] text-[24px]">deceased</span>
                    <span className="font-body-md text-[#881337] font-bold line-through truncate">{p.nickname}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Daftar Warga Hidup */}
          <section className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between border-b border-[#e7e0d3] pb-1">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[#15803d] text-[20px]">groups</span>
                <span className="font-label-md text-label-md text-[#15803d] uppercase tracking-wider font-bold">Penduduk Yang Tersisa</span>
              </div>
              <span className="font-label-sm text-label-sm text-[#166534] bg-[#dcfce7] px-2 py-0.5 rounded-full">{alivePlayers.length} Hidup</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
              {alivePlayers.map((p: any) => {
                const isMe = p.id === currentPlayer.id;
                return (
                  <div key={p.id} className={`flex flex-col items-center gap-1 p-space-sm rounded-lg border ${isMe ? 'bg-[#ffedd5] border-[#fdba74]' : 'bg-white border-[#e7e0d3]'}`}>
                    <div className="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#475569] mb-1">
                      <span className="material-symbols-outlined text-[28px]">account_circle</span>
                    </div>
                    <span className={`font-label-md text-label-md text-center w-full truncate ${isMe ? 'text-[#9a3412] font-bold' : 'text-[#334155]'}`}>{p.nickname}</span>
                    {isMe && <span className="font-label-sm text-[#d97707] text-[10px]">(Anda)</span>}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Kotak Obrolan Langsung */}
          <section className="flex flex-col rounded-xl overflow-hidden border border-[#e7e0d3] bg-white shadow-sm mt-space-sm mb-32 h-[450px]">
            {/* Header Tabs Obrolan */}
            <div className="flex border-b border-[#e7e0d3] bg-[#f8fafc]">
              <button className="flex-1 py-3 text-center border-b-2 border-[#d97707] text-[#d97707] font-label-md font-bold uppercase tracking-wider">
                Musyawarah Terbuka
              </button>
            </div>
            
            {/* Area Pesan */}
            <div className="flex-1 p-space-md flex flex-col gap-space-md overflow-y-auto bg-[#fafafa]">
              {messages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex flex-col ${!msg.player_id ? 'items-center' : msg.player_id === currentPlayer.id ? 'items-end' : 'items-start'}`}>
                  {!msg.player_id ? (
                    <div className="text-center px-4 py-1.5 bg-[#fef2f2] border border-[#fecdd3] text-[#be123c] rounded-full font-label-sm text-label-sm shadow-sm mb-2 max-w-[80%]">
                      {msg.message}
                    </div>
                  ) : (
                    <div className={`max-w-[85%] ${msg.player_id === currentPlayer.id ? 'bg-[#ffedd5] text-[#9a3412] rounded-l-2xl rounded-tr-2xl' : 'bg-white border border-[#e2e8f0] text-[#334155] rounded-r-2xl rounded-tl-2xl'} p-space-sm shadow-sm`}>
                      <span className={`block font-label-sm text-label-sm ${msg.player_id === currentPlayer.id ? 'text-[#d97707]' : 'text-[#64748b]'} mb-1`}>
                        {msg.players?.nickname || 'Unknown'}
                      </span>
                      <p className="font-body-md text-body-md leading-snug">{msg.message}</p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Pesan */}
            <form onSubmit={handleSendMessage} className="p-space-sm bg-white border-t border-[#e7e0d3] flex items-center gap-space-xs">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={!currentPlayer.is_alive || loading}
                placeholder={currentPlayer.is_alive ? "Tulis kecurigaanmu..." : "Orang mati tidak bisa bicara..."}
                className="flex-1 h-12 px-space-md bg-[#f1f5f9] border border-transparent rounded-full font-body-md text-[#334155] focus:outline-none focus:border-[#d97707] focus:bg-white transition-colors disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim() || !currentPlayer.is_alive || loading}
                className="w-12 h-12 rounded-full bg-[#d97707] hover:bg-[#b45309] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </form>
          </section>

        </div>
      </main>

      {/* Floating Action Button untuk Admin */}
      {isAdmin && (
        <div className="fixed bottom-0 left-0 w-full p-gutter-mobile pb-safe bg-gradient-to-t from-white via-white/90 to-transparent z-40">
          <button 
            onClick={handleStartVoting}
            disabled={loading}
            className="w-full h-14 rounded-full bg-[#e11d48] hover:bg-[#be123c] text-white font-headline-md text-headline-md tracking-wider flex items-center justify-center gap-space-sm shadow-[0_4px_16px_rgba(225,29,72,0.4)] active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[24px]">gavel</span>
            {loading ? 'MEMPROSES...' : 'MULAI PENGADILAN (VOTING)'}
          </button>
        </div>
      )}
    </div>
  );
}
