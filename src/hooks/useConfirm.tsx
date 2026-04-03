/**
 * useConfirm - Hook for showing confirmation modals
 * Reusable across the app for any confirmation action
 */
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ConfirmModal,
  ConfirmModalIconName,
  ConfirmModalType,
} from "../components/ui/ConfirmModal";

export interface ConfirmOptions {
  type?: ConfirmModalType;
  iconName?: ConfirmModalIconName;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

interface ConfirmContextType {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    message: "",
  });
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const resolveConfirm = (confirmed: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setVisible(false);
    resolver?.(confirmed);
  };

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      if (resolverRef.current) {
        resolverRef.current(false);
      }

      resolverRef.current = resolve;
      setOptions({
        ...opts,
        confirmText:
          opts.confirmText ??
          t("common.confirm", { defaultValue: "Confirm" }),
        cancelText:
          opts.showCancel === false
            ? undefined
            : (opts.cancelText ??
              t("common.cancel", { defaultValue: "Cancel" })),
      });
      setVisible(true);
    });
  };

  const handleCancel = () => resolveConfirm(false);
  const handleConfirm = () => resolveConfirm(true);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        visible={visible}
        type={options.type}
        iconName={options.iconName}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        showCancel={options.showCancel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  
  if (!context) {
    console.warn("useConfirm must be used within a ConfirmProvider. It will return a dummy function if used outside provider.");
  }

  const confirm = context?.confirm || (async () => false);

  // Return empty component for backwards compatibility with screens that still render it
  return {
    confirm,
    ConfirmModal: () => null,
  };
};
