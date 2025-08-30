export const generateUniqueId = (): string => {
    return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
};