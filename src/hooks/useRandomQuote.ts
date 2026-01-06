import { useState, useEffect } from 'react';
import { useLocaleStore } from '@/stores/settings/LocaleStore';

interface Quote {
    content: string;
    author: string;
}

interface QuotesData {
    [category: string]: Quote[];
}

export function useRandomQuote() {
    const { locale } = useLocaleStore();
    const [quote, setQuote] = useState<Quote | null>(null);

    useEffect(() => {
        const fetchQuote = async () => {
            const isZh = locale === 'zh';
            const fileName = isZh ? 'quotes-zh.json' : 'quotes.json';

            try {
                const response = await fetch(`/${fileName}`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data: QuotesData = await response.json();

                // Flatten all quotes into a single array
                const allQuotes: Quote[] = Object.values(data).flat();

                if (allQuotes.length > 0) {
                    const randomIndex = Math.floor(Math.random() * allQuotes.length);
                    setQuote(allQuotes[randomIndex]);
                }
            } catch (error) {
                console.error('Failed to fetch quote:', error);
            }
        };

        fetchQuote();
    }, [locale]);

    return quote;
}
