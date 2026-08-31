import { createContext, useContext, useState, type ReactNode } from 'react';

type AiModeContextValue = {
  aiMode: boolean;
  setAiMode: (enabled: boolean) => void;
  toggleAiMode: () => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
};

const AiModeContext = createContext<AiModeContextValue | null>(null);

export function AiModeProvider({ children }: { children: ReactNode }) {
  const [aiMode, setAiMode] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <AiModeContext.Provider
      value={{
        aiMode,
        setAiMode,
        toggleAiMode: () => setAiMode((v) => !v),
        assistantOpen,
        setAssistantOpen,
      }}
    >
      {children}
    </AiModeContext.Provider>
  );
}

export function useAiMode() {
  const ctx = useContext(AiModeContext);
  if (!ctx) throw new Error('useAiMode must be used within AiModeProvider');
  return ctx;
}
