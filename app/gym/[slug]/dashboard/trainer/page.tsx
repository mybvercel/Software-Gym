import TrainerDashboard from "@/components/dashboard/TrainerDashboard";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TrainerDashboardPage({ params }: Props) {
  const { slug } = await params;
  return <TrainerDashboard gymSlug={slug} />;
}
