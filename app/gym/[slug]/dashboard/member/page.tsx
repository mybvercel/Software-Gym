import MemberDashboard from "@/components/dashboard/MemberDashboard";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MemberDashboardPage({ params }: Props) {
  const { slug } = await params;
  return <MemberDashboard gymSlug={slug} />;
}
