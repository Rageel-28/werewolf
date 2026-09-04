'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken } from '@/lib/session';
import { createRoomAction, joinRoomAction } from './actions';

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState(['', '', '', '', '']);
  const [isJoining, setIsJoining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  
  const codeRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    setSessionToken(getSessionToken());
  }, []);

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError('Silakan masukkan identitas samaran (Nickname)');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await createRoomAction(nickname, sessionToken);
      if (res.error) {
        setError(res.error);
      } else if (res.roomCode) {
        router.push(`/room/${res.roomCode}`);
      }
    } catch (err) {
      setError('Terjadi kesalahan yang tidak terduga');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const fullCode = roomCode.join('').toUpperCase();
    if (!nickname.trim() || fullCode.length !== 5) {
      setError('Silakan masukkan nama dan 5 karakter kode desa');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await joinRoomAction(nickname, fullCode, sessionToken);
      if (res.error) {
        setError(res.error);
      } else if (res.success && res.roomCode) {
        router.push(`/room/${res.roomCode}`);
      }
    } catch (err) {
      setError('Terjadi kesalahan yang tidak terduga');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const newCode = [...roomCode];
    newCode[index] = value.slice(-1).toUpperCase();
    setRoomCode(newCode);

    if (value && index < 4) {
      codeRefs[index + 1].current?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !roomCode[index] && index > 0) {
      codeRefs[index - 1].current?.focus();
    }
  };

  const generateRandomName = () => {
    const randomNames = ['Valerius', 'Lady Morgana', 'Grimm', 'Rowena', 'Balthazar', 'Seraphina', 'Ignis Wolf', 'Vespera', 'Elena', 'Gideon', 'Alastor'];
    setNickname(randomNames[Math.floor(Math.random() * randomNames.length)]);
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
        <div className="h-16 px-gutter-mobile flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md tracking-wider text-primary uppercase leading-tight drop-shadow-md">Lycans</span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant font-bold">Village Square</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <button className="w-11 h-11 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary transition-colors active:scale-95">
              <span className="material-symbols-outlined text-[20px]">volume_up</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col relative w-full pt-16 pb-hud-bottom-safe bg-surface min-h-screen">
        <div className="flex flex-col w-full px-gutter-mobile gap-space-lg relative overflow-hidden">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary-container/20 blur-[90px] pointer-events-none"></div>
          <div className="absolute top-64 -right-16 w-56 h-56 rounded-full bg-secondary-container/15 blur-[80px] pointer-events-none"></div>
          
          <section className="relative flex flex-col items-center text-center pt-space-xs">
            <div className="relative flex items-center justify-center mb-space-sm group">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl group-hover:blur-2xl transition-all"></div>
              <span className="material-symbols-outlined text-[80px] text-primary relative drop-shadow-[0_0_20px_rgba(208,188,255,0.45)]">nightlight</span>
            </div>
            
            <div className="inline-flex items-center gap-space-xs px-space-md py-space-2xs rounded-full bg-surface-container-high text-secondary mb-space-xs shadow-md">
              <span className="material-symbols-outlined text-[16px]">dark_mode</span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest font-bold">Misteri Ravenshire</span>
            </div>
            
            <h1 className="font-headline-2xl-mobile text-headline-2xl-mobile tracking-wider text-primary uppercase drop-shadow-[0_2px_12px_rgba(160,120,255,0.4)]">
              WEREWOLF
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs mt-space-2xs">
              Dark Moon Chronicles • Multiplayer Deduksi Misteri Online
            </p>
          </section>

          {error && (
            <div className="bg-error-container/80 text-on-error-container p-3 rounded-lg text-sm text-center shadow border border-error/50">
              {error}
            </div>
          )}

          <section className="relative rounded-xl bg-surface-container p-space-md shadow-[0_16px_36px_rgba(0,0,0,0.6)] z-10">
            <div className="flex items-center justify-between pb-space-sm mb-space-md bg-surface-container-high/60 -mx-space-md -mt-space-md p-space-md rounded-t-xl">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">shield_moon</span>
                <span className="font-headline-md text-headline-md text-on-surface">Pintu Gerbang Desa</span>
              </div>
              <span className="px-space-xs py-space-2xs rounded bg-surface-container-lowest font-label-sm text-label-sm text-primary">KARTU PETUALANG</span>
            </div>
            
            <div className="flex flex-col gap-space-xs mb-space-base">
              <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant flex items-center gap-space-2xs">
                <span className="material-symbols-outlined text-[16px] text-secondary">badge</span>
                Identitas Samaran (Nickname)
              </label>
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full h-14 pl-12 pr-space-md rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary shadow-inner" 
                  placeholder="Masukkan Nama Karakter..." 
                  maxLength={16} 
                />
                <span className="material-symbols-outlined absolute left-4 text-outline-variant text-[20px]">psychology_alt</span>
                <button 
                  type="button" 
                  onClick={generateRandomName}
                  className="absolute right-3 p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-secondary active:scale-95 transition-transform" 
                  title="Acak Nama"
                >
                  <span className="material-symbols-outlined text-[18px]">casino</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-space-xs p-space-2xs bg-surface-container-lowest rounded-lg mb-space-base">
              <button 
                type="button" 
                onClick={() => setIsJoining(false)}
                className={`h-11 rounded-lg font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-space-xs transition-all ${!isJoining ? 'bg-primary-container text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
                Buat Ruang
              </button>
              <button 
                type="button" 
                onClick={() => setIsJoining(true)}
                className={`h-11 rounded-lg font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-space-xs transition-all ${isJoining ? 'bg-primary-container text-on-primary font-bold shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[18px]">meeting_room</span>
                Gabung Kode
              </button>
            </div>
            
            {!isJoining ? (
              <div className="flex flex-col gap-space-md">
                <div className="rounded-lg bg-surface-container-low p-space-sm flex items-center gap-space-sm border border-surface-container-high">
                  <div className="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface font-bold truncate">Format Ruang: Bebas Kustom</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant truncate">Anda akan menjadi Host desa</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full h-14 rounded-lg bg-primary hover:bg-primary-fixed-dim text-on-primary font-headline-md text-headline-md tracking-wider flex items-center justify-center gap-space-sm shadow-[0_4px_16px_rgba(208,188,255,0.35)] active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[24px]">crown</span>
                  {loading ? 'MEMBUAT...' : 'BUAT PERKUMPULAN'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-space-md">
                <div className="flex flex-col gap-space-xs items-center">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Ketik 5 Karakter Kode Desa</span>
                  <div className="flex justify-between gap-space-xs w-full max-w-[280px]">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <input
                        key={index}
                        ref={codeRefs[index]}
                        type="text"
                        maxLength={1}
                        value={roomCode[index]}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(index, e)}
                        className="w-12 h-14 text-center rounded-lg bg-surface-container-lowest font-headline-lg text-headline-lg text-secondary uppercase shadow-inner focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    ))}
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleJoinRoom}
                  disabled={loading}
                  className="w-full h-14 rounded-lg bg-secondary-container hover:bg-secondary text-on-secondary-container font-headline-md text-headline-md tracking-wider flex items-center justify-center gap-space-sm shadow-[0_4px_16px_rgba(217,119,7,0.3)] active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[24px]">door_open</span>
                  {loading ? 'MEMASUKI...' : 'MASUKI DESA'}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
