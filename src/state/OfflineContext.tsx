import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

const Ctx = createContext({ online: true });
export const useNet = () => useContext(Ctx);
export function NetProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener((s) => setOnline(!!s.isConnected)), []);
  return <Ctx.Provider value={{ online }}>{children}</Ctx.Provider>;
}
