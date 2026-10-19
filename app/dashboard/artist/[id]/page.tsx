import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

/** Artist pages moved to the public `/artist/[id]` route (#586). This keeps old links working. */
export default async function LegacyArtistPage({ params }: Props) {
  const { id } = await params;
  redirect(`/artist/${encodeURIComponent(id)}`);
}
