import { PageTracker } from '@/components/game/page-tracker';

export default function IslandLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-pulse">⛵</div>
        <p className="text-text/60">正在驶向小岛...</p>
      </div>
    </div>
  );
}
