import { useSettingsStore } from "@/stores/settings/SettingsStore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORIES = [
    "economics",
    "gfw",
    "history",
    "interest",
    "life",
    "management",
    "politics",
    "programming"
];

export function QuoteSettings() {
    const { enabledQuoteCategories, setEnabledQuoteCategories } = useSettingsStore();

    const toggleCategory = (category: string) => {
        if (enabledQuoteCategories.includes(category)) {
            setEnabledQuoteCategories(enabledQuoteCategories.filter(c => c !== category));
        } else {
            setEnabledQuoteCategories([...enabledQuoteCategories, category]);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Quote Filters</h2>
            <Card>
                <CardContent className="flex flex-col gap-4">
                    {CATEGORIES.map((category) => (
                        <div key={category} className="flex items-center justify-between space-x-2">
                            <Label htmlFor={`quote-cat-${category}`} className="capitalize">
                                {category}
                            </Label>
                            <Switch
                                id={`quote-cat-${category}`}
                                className="data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
                                checked={enabledQuoteCategories.includes(category)}
                                onCheckedChange={() => toggleCategory(category)}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
