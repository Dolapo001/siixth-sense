import type { Metadata } from "next";
import { MotionPreferences } from "@/components/shared/motion-preferences";
import { AnalyzeExperience } from "@/features/image-analysis/analyze-experience";

export const metadata: Metadata = { title: "Analyze" };

export default function AnalyzePage() {
  return (
    <MotionPreferences>
      <AnalyzeExperience />
    </MotionPreferences>
  );
}
