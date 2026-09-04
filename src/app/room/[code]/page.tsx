'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getSessionToken } from '@/lib/session';

// Placeholder components
import Lobby from './components/Lobby';
import NightPhase from './components/NightPhase';
import DayPhase from './components/DayPhase';
import VotingPhase from './components/VotingPhase';
import GameOver from './components/GameOver';
import HunterRevenge from './components/HunterRevenge';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState('');

  useEffect(() => {
    setSessionToken(getSessionToken());
  }, []);

  useEffect(() => {
    if (!sessionToken) return;

    const fetchInitialData = async () => {
      // Fetch Room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomError || !roomData) {
        alert('Ruang tidak ditemukan!');
        router.push('/');
        return;
      }
      setRoom(roomData);

      // Fetch Players
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id);

      if (playersData) {
        setPlayers(playersData);
        const me = playersData.find(p => p.session_token === sessionToken);
        if (me) {
          setCurrentPlayer(me);
        } else {
          // If not in room, redirect to join
          router.push('/');
          return;
        }
      }

      setLoading(false);
    };

    fetchInitialData();

    // Subscribe to Room changes
    const roomSub = supabase
      .channel(`room_updates_${roomCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
        setRoom(payload.new);
      })
      .subscribe();

    // Subscribe to Player changes
    // Note: We don't have the room.id initially in the outer scope, so we can subscribe to all players or filter later
    // For MVP, since we don't have roomId synchronously, let's subscribe in a nested effect or rely on a function
    
    return () => {
      supabase.removeChannel(roomSub);
    };
  }, [roomCode, sessionToken, router]);

  // Separate effect for players once we have roomId
  useEffect(() => {
    if (!room?.id) return;

    const playersSub = supabase
      .channel(`players_updates_${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, async () => {
        // Just refetch players to be safe and simple
        const { data: updatedPlayers } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', room.id);
        
        if (updatedPlayers) {
          setPlayers(updatedPlayers);
          const me = updatedPlayers.find(p => p.session_token === sessionToken);
          setCurrentPlayer(me);
        }
      })
      .subscribe();

    // FALLBACK POLLING: If realtime fails or is blocked by network, poll every 3 seconds
    const pollInterval = setInterval(async () => {
       const { data: currentRoom } = await supabase.from('rooms').select('*').eq('id', room.id).single();
       if (currentRoom) setRoom(currentRoom);

       const { data: currentPlayers } = await supabase.from('players').select('*').eq('room_id', room.id);
       if (currentPlayers) {
          setPlayers(currentPlayers);
          const me = currentPlayers.find(p => p.session_token === sessionToken);
          setCurrentPlayer(me);
       }
    }, 3000);

    return () => {
      supabase.removeChannel(playersSub);
      clearInterval(pollInterval);
    }
  }, [room?.id, sessionToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  const isAdmin = room?.admin_id === sessionToken;

  return (
    <main className="min-h-screen">
      {room.status === 'waiting' && <Lobby room={room} players={players} currentPlayer={currentPlayer} isAdmin={isAdmin} />}
      {room.status === 'night' && <NightPhase room={room} players={players} currentPlayer={currentPlayer} isAdmin={isAdmin} />}
      {room.status === 'day' && <DayPhase room={room} players={players} currentPlayer={currentPlayer} isAdmin={isAdmin} />}
      {room.status === 'voting' && <VotingPhase room={room} players={players} currentPlayer={currentPlayer} isAdmin={isAdmin} />}
      {(room.status === 'finished' || room.status === 'finished_fool') && <GameOver room={room} players={players} currentPlayer={currentPlayer} isAdmin={isAdmin} />}
      {(room.status === 'hunter_revenge_day' || room.status === 'hunter_revenge_night') && <HunterRevenge room={room} players={players} currentPlayer={currentPlayer} isAdmin={isAdmin} />}
    </main>
  );
}
