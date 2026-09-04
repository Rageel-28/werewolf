'use client';

import { useRouter } from 'next/navigation';

export default function GameOver({ room, players, currentPlayer, isAdmin }: any) {
  const router = useRouter();

  const alivePlayers = players.filter((p: any) => p.is_alive);
  const evilCount = alivePlayers.filter((p: any) => ['Werewolf', 'Minion'].includes(p.role)).length;
  const goodCount = alivePlayers.length - evilCount;
  
  let winner = 'Belum Ada';
  let winnerDesc = '';
  let themeColor = 'primary'; // 'primary', 'error', 'secondary'
  let themeIcon = 'emoji_events';
  
  if (room.status === 'finished_fool') {
    winner = 'VICTORY: SI LUGU MENANG!';
    winnerDesc = 'Si Lugu (Fool) berhasil memanipulasi warga desa untuk mengeksekusinya di siang hari!';
    themeColor = 'secondary';
    themeIcon = 'person_cancel';
  } else if (evilCount === 0) {
    winner = 'VICTORY: WARGA MENANG!';
    winnerDesc = 'Semua Manusia Serigala dan pengikutnya telah mati. Kedamaian kembali ke desa.';
    themeColor = 'primary';
    themeIcon = 'emoji_events';
  } else if (evilCount >= goodCount) {
    winner = 'VICTORY: WEREWOLF MENANG!';
    winnerDesc = 'Manusia Serigala dan pengikutnya telah menguasai desa sepenuhnya.';
    themeColor = 'error';
    themeIcon = 'pets';
  } else {
    winner = 'PERMAINAN SELESAI';
    winnerDesc = 'Tidak ada pemenang mutlak.';
    themeColor = 'outline';
    themeIcon = 'flag';
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Werewolf': return 'pets';
      case 'Seer': return 'visibility';
      case 'Guardian': return 'shield';
      case 'Hunter': return 'my_location';
      case 'Minion': return 'theater_comedy';
      case 'Fool': return 'person_cancel';
      default: return 'person';
    }
  };

  const getThemeClasses = () => {
    switch (themeColor) {
      case 'error': return {
        text: 'text-error',
        bg: 'bg-error',
        bgSubtle: 'bg-error-container/20',
        border: 'border-error/30',
        glow: 'rgba(255,84,74,0.5)',
        onBg: 'text-on-error'
      };
      case 'secondary': return {
        text: 'text-secondary',
        bg: 'bg-secondary',
        bgSubtle: 'bg-secondary-container/20',
        border: 'border-secondary/30',
        glow: 'rgba(217,119,7,0.5)',
        onBg: 'text-on-secondary'
      };
      default: return { // primary
        text: 'text-primary',
        bg: 'bg-primary',
        bgSubtle: 'bg-primary-container/20',
        border: 'border-primary/30',
        glow: 'rgba(208,188,255,0.5)',
        onBg: 'text-on-primary'
      };
    }
  };

  const t = getThemeClasses();

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen relative overflow-hidden">
      
      {/* Background Glow */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none -z-10`} style={{ backgroundColor: t.glow }}></div>

      <main className="flex flex-col w-full pt-16 pb-hud-bottom-safe min-h-screen z-10 px-gutter-mobile">
        
        <section className="flex flex-col items-center text-center gap-space-sm pt-space-xl">
          <div className="relative mb-space-sm">
            <div className={`absolute inset-0 blur-2xl rounded-full`} style={{ backgroundColor: t.glow }}></div>
            <span className={`material-symbols-outlined text-[100px] ${t.text} relative animate-pulse`} style={{ filter: `drop-shadow(0 0 20px ${t.glow})` }}>
              {themeIcon}
            </span>
          </div>
          <h1 className={`font-headline-2xl-mobile text-headline-2xl-mobile ${t.text} uppercase tracking-wider leading-tight drop-shadow-md`}>
            {winner}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mt-space-2xs">
            {winnerDesc}
          </p>
        </section>

        <section className="flex flex-col gap-space-sm mt-space-2xl w-full max-w-2xl mx-auto mb-32">
          <div className="flex items-center gap-space-xs border-b border-surface-container-high pb-2">
            <span className="material-symbols-outlined text-secondary text-[24px]">theater_comedy</span>
            <span className="font-headline-md text-headline-md text-on-surface uppercase tracking-wider">Tabir Peran</span>
          </div>
          
          <div className="flex flex-col gap-space-xs">
            {players.map((p: any) => {
              const isEvil = ['Werewolf', 'Minion'].includes(p.role);
              const isSolo = p.role === 'Fool';
              const roleColor = isEvil ? 'text-error' : (isSolo ? 'text-secondary' : 'text-primary');
              const roleBg = isEvil ? 'bg-error-container/20 border-error/30' : (isSolo ? 'bg-secondary-container/20 border-secondary/30' : 'bg-primary-container/20 border-primary/30');

              return (
                <div key={p.id} className="flex items-center justify-between p-space-sm bg-surface-container rounded-xl border border-surface-container-high shadow-sm">
                  <div className="flex items-center gap-space-sm">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${roleBg} ${roleColor}`}>
                        <span className="material-symbols-outlined text-[24px]">{getRoleIcon(p.role)}</span>
                      </div>
                      {!p.is_alive && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface border border-surface-container-high flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">skull</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                        {p.nickname}
                        {p.id === currentPlayer?.id && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-surface-container-highest text-on-surface-variant">Anda</span>
                        )}
                      </span>
                      <span className={`font-label-sm text-label-sm uppercase tracking-widest ${roleColor} font-bold`}>{p.role}</span>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded bg-surface-container-highest border border-surface-container-high">
                    <span className={`font-label-sm text-label-sm uppercase font-bold ${p.is_alive ? 'text-[#15803d]' : 'text-on-surface-variant'}`}>
                      {p.is_alive ? 'Hidup' : 'Mati'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      <div className="fixed bottom-0 left-0 w-full p-gutter-mobile pb-safe bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/95 to-transparent z-40 flex justify-center">
        <button 
          onClick={() => router.push('/')}
          className="w-full max-w-2xl h-14 rounded-full bg-surface-container-high border border-surface-container-highest hover:bg-surface-container-highest text-on-surface font-headline-md text-headline-md tracking-wider flex items-center justify-center gap-space-sm shadow-lg active:scale-[0.98] transition-transform"
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
          KEMBALI KE BERANDA
        </button>
      </div>

    </div>
  );
}
