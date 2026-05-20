'use client'
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextData {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  loadingMessage: string;
  setLoadingMessage: (msg: string) => void;
}

const LoadingContext = createContext<LoadingContextData>({} as LoadingContextData);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processando...');

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading, loadingMessage, setLoadingMessage }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="relative flex flex-col items-center p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
            {/* Spinner Animado */}
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-zinc-200 dark:border-zinc-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-zinc-900 dark:text-zinc-100 font-medium text-lg animate-pulse">
              {loadingMessage}
            </p>
            <span className="mt-2 text-zinc-500 text-xs uppercase tracking-widest">Aguarde um momento</span>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);
