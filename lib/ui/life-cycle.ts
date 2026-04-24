'use client'

import { useEffect, useRef } from 'react';
import { devLog } from '../utils/log';

export function useLifecycleLog(name) {
  const renderedCount = useRef(0);
  renderedCount.current++;

  useEffect(() => {
    devLog(`[${name}] ✅ Montado`);
    
    return () => {
      devLog(`[${name}] ❌ Desmontado`);
    };
  }, [name]);

  devLog(`[${name}] 🌀 Renderização nº: ${renderedCount.current}`);
}