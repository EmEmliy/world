import type { Metadata } from 'next';
import { PersonalityClient } from './_client';
import { getPersonality } from '@/lib/eati';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const personality = getPersonality(code.toUpperCase());
  return {
    title: `${personality.emoji} ${personality.name} · EATI 饮食人格`,
    description: `${personality.tagline} — 来龙虾商圈测测你的饮食人格！`,
  };
}

export default async function PersonalityPage({ params }: Props) {
  const { code } = await params;
  return <PersonalityClient code={code.toUpperCase()} />;
}
