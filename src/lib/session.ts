import { v4 as uuidv4 } from 'uuid';

export const getSessionToken = (): string => {
  if (typeof window === 'undefined') return '';
  
  let token = localStorage.getItem('werewolf_session_token');
  if (!token) {
    token = uuidv4();
    localStorage.setItem('werewolf_session_token', token);
  }
  return token;
};
