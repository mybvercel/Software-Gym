import WorkoutSession from "@/components/dashboard/WorkoutSession";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata = { title: "Entrenamiento del día — GymOS" };

export default async function WorkoutPage({ params }: Props) {
  const { slug } = await params;
  return <WorkoutSession gymSlug={slug} />;
}
