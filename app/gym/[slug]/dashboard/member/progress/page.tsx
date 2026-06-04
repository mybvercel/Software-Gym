import MemberProgress from "@/components/dashboard/MemberProgress";

interface Props { params: Promise<{ slug: string }> }

export const metadata = { title: "Mi Progreso — GymOS" };

export default async function ProgressPage({ params }: Props) {
  const { slug } = await params;
  return <MemberProgress gymSlug={slug} />;
}
