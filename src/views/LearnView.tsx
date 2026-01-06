import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect } from "react";
import { Star, ExternalLink } from "lucide-react";

export interface LearningNode {
  id: string;
  title: string;
  author?: string;
  provider?: string;
  type: "book" | "course" | "craft";
  tab: "book" | "video";
  externalUrl?: string;
  coverImage?: string;
  description?: string;
  tags?: string[];
  rating?: number;
  reviews?: number;
  affiliate?: {
    amazonUS?: string;
    amazonCN?: string;
    amazonJP?: string;
  };
  curator?: string;
  curatorNote?: string;
}

type Region = 'US' | 'CN' | 'JP';

const LEARNING_JSON_PATH = "/learningNodes.json";

const TYPE_COLOR_MAP: Record<string, string> = {
  book: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  course: "bg-green-500/10 text-green-600 dark:text-green-400",
  craft: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const REGION_FLAGS: Record<Region, string> = {
  US: "🇺🇸",
  CN: "🇨🇳",
  JP: "🇯🇵",
};

// Helper function to get affiliate link based on region
const getAffiliateLink = (node: LearningNode, region: Region): string => {
  // For video content, use externalUrl directly
  if (node.tab === "video") {
    return node.externalUrl || "#";
  }

  // For books, prefer affiliate links
  if (node.affiliate) {
    const regionMap: Record<Region, string | undefined> = {
      US: node.affiliate.amazonUS,
      CN: node.affiliate.amazonCN,
      JP: node.affiliate.amazonJP,
    };

    return regionMap[region] || node.affiliate.amazonUS || node.externalUrl || "#";
  }

  return node.externalUrl || "#";
};

// Detect user region from browser locale
const detectUserRegion = (): Region => {
  const locale = navigator.language.toLowerCase();

  if (locale.includes("zh")) return "CN";
  if (locale.includes("ja")) return "JP";
  return "US";
};

export const LearnView: React.FC = () => {
  const [nodes, setNodes] = useState<LearningNode[]>([]);
  const [activeTab, setActiveTab] = useState<"book" | "video">("book");
  const [userRegion, setUserRegion] = useState<Region>("US");

  // Load data
  useEffect(() => {
    fetch(LEARNING_JSON_PATH)
      .then((res) => res.json())
      .then((data: LearningNode[]) => setNodes(data))
      .catch((err) => console.error("Failed to load learning nodes:", err));
  }, []);

  // Detect user region on mount
  useEffect(() => {
    setUserRegion(detectUserRegion());
  }, []);

  const filteredNodes = nodes.filter((node) => node.tab === activeTab);

  return (
    <div className="flex-1 p-6 overflow-auto bg-background text-foreground">
      {/* Header with region selector */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold tracking-tight">
          🚀 Learning Navigation
        </h2>

        {/* Region selector - only show for books */}
        {activeTab === "book" && (
          <select
            value={userRegion}
            onChange={(e) => setUserRegion(e.target.value as Region)}
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="US">{REGION_FLAGS.US} Amazon US</option>
            <option value="CN">{REGION_FLAGS.CN} Amazon CN</option>
            <option value="JP">{REGION_FLAGS.JP} Amazon JP</option>
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex mb-6 border-b">
        {["book", "video"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "book" | "video")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "book" ? "📚 Books" : "🎥 Videos"}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredNodes.length === 0 && (
        <div className="text-muted-foreground text-center py-12">
          No items in this tab.
        </div>
      )}

      {/* Grid of cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredNodes.map((node) => (
          <a
            key={node.id}
            href={getAffiliateLink(node, userRegion)}
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-5 bg-card text-card-foreground border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transform transition-all duration-200"
          >
            {/* Cover Image */}
            {node.coverImage && (
              <div className="mb-3 rounded-lg overflow-hidden bg-muted">
                <img
                  src={node.coverImage}
                  alt={node.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Title + Type Badge */}
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2 flex-1 mr-2">
                {node.title}
              </h3>
              <span
                className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider whitespace-nowrap ${
                  TYPE_COLOR_MAP[node.type]
                }`}
              >
                {node.type}
              </span>
            </div>

            {/* Author/Provider */}
            <p className="text-sm text-muted-foreground mb-3">
              {node.author || node.provider || "Unknown"}
            </p>

            {/* Rating */}
            {node.rating && (
              <div className="flex items-center gap-1 mb-3">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{node.rating}</span>
                {node.reviews && (
                  <span className="text-xs text-muted-foreground">
                    ({node.reviews.toLocaleString()})
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {node.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {node.description}
              </p>
            )}

            {/* Tags */}
            {node.tags && node.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {node.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] px-2 py-0 font-medium"
                  >
                    {tag}
                  </Badge>
                ))}
                {node.tags.length > 3 && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-0">
                    +{node.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Curator Note (if available) */}
            {node.curatorNote && (
              <div className="mb-3 p-2 bg-primary/5 rounded-md border border-primary/10">
                <p className="text-xs text-muted-foreground italic">
                  💡 {node.curatorNote}
                </p>
              </div>
            )}

            {/* CTA - Simple and clear */}
            <div className="mt-auto pt-3 flex items-center justify-between text-sm font-medium text-primary">
              <span className="group-hover:underline">
                {node.tab === "book" ? "View on Amazon" : "Watch Now"}
              </span>
              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </div>

      {/* Affiliate Disclosure */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground">
        <p>
          💡 <strong>Disclosure:</strong> As an Amazon Associate, Codexia may
          earn from qualifying purchases. This helps support free and
          open-source development. Thank you for your support!
        </p>
      </div>
    </div>
  );
};
