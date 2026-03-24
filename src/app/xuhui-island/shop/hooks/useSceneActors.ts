'use client';

import { useState, useEffect, useRef } from 'react';
import type { SceneActor } from '../types/shop-types';
import type { XuhuiShop } from '@/config/xuhui-shops';
import { buildInitialActors } from '../utils/actor-utils';

export function useSceneActors(shop: XuhuiShop | undefined) {
  const [actors, setActors] = useState<SceneActor[]>(() => {
    if (!shop) return [];
    return buildInitialActors(shop);
  });
  const hoveredActorKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shop) return;
    const interval = setInterval(() => {
      setActors(prev => {
        const next = prev.map(actor => {
          if (actor.role === 'guest' && Math.random() < 0.03) {
            return { ...actor, flipped: !actor.flipped };
          }
          if (Math.random() < 0.02) {
            return { ...actor, bubbleVisible: !actor.bubbleVisible };
          }
          return actor;
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [shop]);

  return {
    actors,
    setActors,
    hoveredActorKeyRef,
  };
}
