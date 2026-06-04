import MemberOnboarding from "@/components/dashboard/MemberOnboarding";

interface Props { params: Promise<{ slug: string }> }

export const metadata = { title: "Bienvenido a GymOS" };

export default async function OnboardingPage({ params }: Props) {
  const { slug } = await params;
  return <MemberOnboarding gymSlug={slug} />;
}
