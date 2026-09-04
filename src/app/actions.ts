'use server'

import { supabase } from '@/lib/supabase'

export async function createRoomAction(nickname: string, sessionToken: string) {
  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert([{ room_code: roomCode, admin_id: sessionToken, status: 'waiting', day_count: 0 }])
    .select().single();

  if (roomError || !room) {
    console.error("SUPABASE ERROR:", roomError);
    return { error: 'Gagal membuat ruang' };
  }

  const { error: playerError } = await supabase
    .from('players')
    .insert([{ room_id: room.id, nickname, session_token: sessionToken, is_alive: true }]);

  if (playerError) return { error: 'Gagal bergabung ke ruang' };
  return { roomCode };
}

export async function joinRoomAction(nickname: string, roomCode: string, sessionToken: string) {
  const code = roomCode.toUpperCase();
  const { data: room, error: roomError } = await supabase.from('rooms').select('id, status').eq('room_code', code).single();
  if (roomError || !room) return { error: 'Ruang tidak ditemukan' };
  if (room.status !== 'waiting') return { error: 'Permainan sudah dimulai' };

  const { data: existingPlayer } = await supabase.from('players').select('id').eq('room_id', room.id).eq('session_token', sessionToken).single();
  if (existingPlayer) return { success: true, roomCode: code };

  const { error: playerError } = await supabase.from('players').insert([{ room_id: room.id, nickname, session_token: sessionToken, is_alive: true }]);
  if (playerError) return { error: 'Gagal bergabung ke ruang' };
  return { success: true, roomCode: code };
}

export async function startGameAction(roomId: string, roles: string[]) {
  const shuffledRoles = [...roles];
  for (let i = shuffledRoles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
  }
  const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId);
  if (!players) return { error: 'Gagal mengambil data pemain' };

  const updates = players.map((p, i) => ({ ...p, role: shuffledRoles[i] }));
  const { error: updateError } = await supabase.from('players').upsert(updates);
  if (updateError) console.error("Update Role Error:", updateError);
  
  await supabase.from('rooms').update({ status: 'night', day_count: 1 }).eq('id', roomId);
  return { success: true };
}

export async function submitNightAction(roomId: string, dayCount: number, actorId: string, targetId: string, actionType: string) {
  const { error } = await supabase.from('night_actions').insert([{
    room_id: roomId, day_count: dayCount, actor_id: actorId, target_id: targetId, action_type: actionType
  }]);
  if (error) return { error: 'Gagal mengirim tindakan' };
  return { success: true };
}

export async function resolveNightAction(roomId: string, dayCount: number) {
  const { data: actions } = await supabase.from('night_actions').select('*').eq('room_id', roomId).eq('day_count', dayCount);
  const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId);
  
  if (actions && players) {
    let wwTargets: string[] = [];
    let protections: string[] = [];
    
    actions.forEach(a => {
      if (a.action_type === 'werewolf' && a.target_id !== 'skip') wwTargets.push(a.target_id);
      if (a.action_type === 'guardian') protections.push(a.target_id);
    });

    let finalKills: string[] = [];
    if (dayCount > 1 && wwTargets.length > 0) {
      // Find the most frequent target
      const counts: Record<string, number> = {};
      wwTargets.forEach(t => counts[t] = (counts[t] || 0) + 1);
      
      let maxCount = 0;
      let targetCandidates: string[] = [];
      Object.entries(counts).forEach(([t, c]) => {
         if (c > maxCount) {
             maxCount = c;
             targetCandidates = [t];
         } else if (c === maxCount) {
             targetCandidates.push(t);
         }
      });
      
      // Randomly pick one if tie
      const selectedTarget = targetCandidates[Math.floor(Math.random() * targetCandidates.length)];
      
      if (!protections.includes(selectedTarget)) {
          finalKills.push(selectedTarget);
      }
    }
    
    for (const victimId of finalKills) {
      await supabase.from('players').update({ is_alive: false }).eq('id', victimId);
      const victim = players.find(p => p.id === victimId);
      if (victim) {
        await supabase.from('chats').insert([{ room_id: roomId, message: `${victim.nickname} ditemukan tewas mengenaskan pagi ini.` }]);
        
        if (victim.role === 'Hunter') {
           await supabase.from('rooms').update({ status: 'hunter_revenge_day' }).eq('id', roomId);
           return { success: true };
        }

        if (victim.role === 'Werewolf') {
          const minion = players.find(p => p.role === 'Minion' && p.is_alive && p.id !== victim.id);
          if (minion) {
            await supabase.from('players').update({ role: 'Werewolf' }).eq('id', minion.id);
            await supabase.from('chats').insert([{ room_id: roomId, message: `Seseorang telah mengambil alih peran Manusia Serigala yang gugur!` }]);
          }
        }
      }
    }

    if (finalKills.length === 0) {
      await supabase.from('chats').insert([{ room_id: roomId, message: `Tidak ada yang mati semalam. Warga bernapas lega.` }]);
    }
  }

  // Check Win conditions
  const { data: currentPlayers } = await supabase.from('players').select('*').eq('room_id', roomId);
  if (currentPlayers) {
    const alive = currentPlayers.filter((p: any) => p.is_alive);
    const evilCount = alive.filter((p: any) => ['Werewolf', 'Minion'].includes(p.role)).length;
    const goodCount = alive.length - evilCount;
    if (evilCount === 0 || evilCount >= goodCount) {
       await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
       return { success: true };
    }
  }

  await supabase.from('rooms').update({ status: 'day', day_count: dayCount }).eq('id', roomId);
  return { success: true };
}

export async function sendChatAction(roomId: string, playerId: string, message: string) {
  await supabase.from('chats').insert([{ room_id: roomId, player_id: playerId, message }]);
  return { success: true };
}

export async function startVotingAction(roomId: string) {
  await supabase.from('rooms').update({ status: 'voting', timer_ends_at: null }).eq('id', roomId);
  return { success: true };
}

export async function startTimerAction(roomId: string, minutes: number) {
  // Using Supabase Postgres function to add minutes to NOW() might be tricky with RPC if not defined.
  // Instead, calculate the end time on the server (JS) and save the ISO string.
  const endsAt = new Date(Date.now() + minutes * 60000).toISOString();
  await supabase.from('rooms').update({ timer_ends_at: endsAt }).eq('id', roomId);
  return { success: true };
}

export async function submitVoteAction(roomId: string, dayCount: number, voterId: string, targetId: string) {
  await supabase.from('votes').insert([{ room_id: roomId, day_count: dayCount, voter_id: voterId, target_id: targetId }]);
  return { success: true };
}

export async function resolveVotingAction(roomId: string, dayCount: number) {
  const { data: votes } = await supabase.from('votes').select('*').eq('room_id', roomId).eq('day_count', dayCount);
  const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId);
  
  if (votes && votes.length > 0 && players) {
    const counts: Record<string, number> = {};
    votes.forEach(v => counts[v.target_id] = (counts[v.target_id] || 0) + 1);
    
    let maxVotes = 0;
    let targetId = '';
    let tie = false;

    Object.entries(counts).forEach(([id, c]) => {
      if (c > maxVotes) {
        maxVotes = c;
        targetId = id;
        tie = false;
      } else if (c === maxVotes) {
        tie = true;
      }
    });

    if (!tie && targetId && targetId !== 'skip') {
      await supabase.from('players').update({ is_alive: false }).eq('id', targetId);
      const victim = players.find(p => p.id === targetId);
      if (victim) {
        await supabase.from('chats').insert([{ room_id: roomId, message: `Warga desa memutuskan untuk mengeksekusi ${victim.nickname}.` }]);
        
        // Check if Fool won
        if (victim.role === 'Fool') {
           await supabase.from('rooms').update({ status: 'finished_fool' }).eq('id', roomId);
           return { success: true };
        }
        
        if (victim.role === 'Hunter') {
           await supabase.from('rooms').update({ status: 'hunter_revenge_night' }).eq('id', roomId);
           return { success: true };
        }

        if (victim.role === 'Werewolf') {
          const minion = players.find(p => p.role === 'Minion' && p.is_alive && p.id !== victim.id);
          if (minion) {
            await supabase.from('players').update({ role: 'Werewolf' }).eq('id', minion.id);
            await supabase.from('chats').insert([{ room_id: roomId, message: `Seseorang telah mengambil alih peran Manusia Serigala yang gugur!` }]);
          }
        }
      }
    } else {
      await supabase.from('chats').insert([{ room_id: roomId, message: `Warga memilih untuk abstain atau suara seimbang. Tidak ada eksekusi hari ini.` }]);
    }
  } else {
    await supabase.from('chats').insert([{ room_id: roomId, message: `Tidak ada suara yang masuk. Warga terlalu takut untuk menuduh.` }]);
  }

  // Check Win conditions
  const { data: currentPlayers } = await supabase.from('players').select('*').eq('room_id', roomId);
  if (currentPlayers) {
    const alive = currentPlayers.filter((p: any) => p.is_alive);
    const evilCount = alive.filter((p: any) => ['Werewolf', 'Minion'].includes(p.role)).length;
    const goodCount = alive.length - evilCount;
    if (evilCount === 0 || evilCount >= goodCount) {
       await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
       return { success: true };
    }
  }

  // Go to next night
  await supabase.from('rooms').update({ status: 'night', day_count: dayCount + 1 }).eq('id', roomId);
  return { success: true };
}

export async function submitHunterRevengeAction(roomId: string, hunterId: string, targetId: string) {
  const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
  const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId);
  
  if (!room || !players) return { success: false };
  
  const target = players.find((p: any) => p.id === targetId);
  const hunter = players.find((p: any) => p.id === hunterId);
  
  if (target && hunter) {
    await supabase.from('players').update({ is_alive: false }).eq('id', targetId);
    await supabase.from('chats').insert([{ room_id: roomId, message: `DOR! Sebelum menghembuskan napas terakhir, Pemburu (${hunter.nickname}) menembak kepala ${target.nickname}!` }]);

    if (target.role === 'Werewolf') {
      const minion = players.find((p: any) => p.role === 'Minion' && p.is_alive && p.id !== target.id);
      if (minion) {
        await supabase.from('players').update({ role: 'Werewolf' }).eq('id', minion.id);
        await supabase.from('chats').insert([{ room_id: roomId, message: `Seseorang telah mengambil alih peran Manusia Serigala yang gugur!` }]);
      }
    }
  }

  // Cek kondisi menang
  const currentPlayers = await supabase.from('players').select('*').eq('room_id', roomId);
  if (currentPlayers.data) {
    const alive = currentPlayers.data.filter((p: any) => p.is_alive);
    const evilCount = alive.filter((p: any) => ['Werewolf', 'Minion'].includes(p.role)).length;
    const goodCount = alive.length - evilCount;
    if (evilCount === 0 || evilCount >= goodCount) {
       await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
       return { success: true };
    }
  }

  if (room.status === 'hunter_revenge_day') {
    await supabase.from('rooms').update({ status: 'day' }).eq('id', roomId);
  } else {
    await supabase.from('rooms').update({ status: 'night', day_count: room.day_count + 1 }).eq('id', roomId);
  }
  return { success: true };
}

export async function skipHunterRevengeAction(roomId: string) {
  const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
  if (!room) return { success: false };
  
  await supabase.from('chats').insert([{ room_id: roomId, message: `Sang Pemburu menghembuskan napas terakhirnya sebelum sempat menarik pelatuk.` }]);

  if (room.status === 'hunter_revenge_day') {
    await supabase.from('rooms').update({ status: 'day' }).eq('id', roomId);
  } else {
    await supabase.from('rooms').update({ status: 'night', day_count: room.day_count + 1 }).eq('id', roomId);
  }
  return { success: true };
}

export async function resetRoomAction(roomId: string) {
  // Clear old game data to avoid clutter and bugs on next rounds
  await supabase.from('night_actions').delete().eq('room_id', roomId);
  await supabase.from('votes').delete().eq('room_id', roomId);
  await supabase.from('chats').delete().eq('room_id', roomId);

  // Reset players
  await supabase.from('players').update({ is_alive: true, role: null }).eq('room_id', roomId);

  // Reset room
  await supabase.from('rooms').update({ status: 'waiting', day_count: 0, timer_ends_at: null }).eq('id', roomId);
  
  return { success: true };
}
