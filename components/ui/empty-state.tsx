import type { LucideIcon } from "lucide-react";
import { Card, CardText, CardTitle } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex min-h-56 items-center justify-center text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
        <CardText>{description}</CardText>
      </div>
    </Card>
  );
}
