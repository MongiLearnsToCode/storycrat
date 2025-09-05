import { cn } from "@/lib/utils";
import { 
  BookOpen,
  Users,
  Feather,
  Zap,
  Download,
  FileText,
  PenTool,
  Layout
} from "lucide-react";

export function FeaturesSectionWithHoverEffects() {
  const features = [
    {
      title: "Proven Frameworks",
      description:
        "Choose from time-tested storytelling structures like the Hero's Journey and Three-Act Structure to guide your narrative.",
      icon: <BookOpen className="h-6 w-6" />,
    },
    {
      title: "Structured Writing",
      description:
        "Break down complex narratives into manageable beats and chapters with clear guidance for each story element.",
      icon: <Layout className="h-6 w-6" />,
    },
    {
      title: "Character Development",
      description:
        "Build rich character profiles with dedicated tools to track relationships, motivations, and character arcs.",
      icon: <Users className="h-6 w-6" />,
    },
    {
      title: "Beat-by-Beat Guidance",
      description: 
        "Follow structured story beats with descriptions and examples to ensure your narrative flows perfectly.",
      icon: <PenTool className="h-6 w-6" />,
    },
    {
      title: "Multiple Frameworks",
      description: 
        "Switch between Hero's Journey, Story Circle, Three-Act Structure, and more to find what works for your story.",
      icon: <Feather className="h-6 w-6" />,
    },
    {
      title: "Progress Tracking",
      description:
        "Visual progress indicators show your completion status and help maintain momentum in your writing journey.",
      icon: <Zap className="h-6 w-6" />,
    },
    {
      title: "Export Options",
      description:
        "Export your completed stories as PDF or TXT files to share, publish, or continue editing elsewhere.",
      icon: <Download className="h-6 w-6" />,
    },
    {
      title: "Auto-Save",
      description: 
        "Never lose your work with automatic saving for signed-in users and local storage for guest writers.",
      icon: <FileText className="h-6 w-6" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto justify-center">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-border",
        (index === 0 || index === 4) && "lg:border-l border-border",
        index < 4 && "lg:border-b border-border"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-muted/50 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-muted/50 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-muted-foreground">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-border group-hover/feature:bg-primary transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">
          {title}
        </span>
      </div>
      <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
