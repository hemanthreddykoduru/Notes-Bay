import { createContext, useState, useContext } from 'react';

const AdContext = createContext();

export function AdProvider({ children }) {
    const [showFallbackAds, setShowFallbackAds] = useState(false);

    return (
        <AdContext.Provider value={{ showFallbackAds, setShowFallbackAds }}>
            {children}
        </AdContext.Provider>
    );
}

export function useAdContext() {
    return useContext(AdContext);
}
