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

export interface ConfirmChoiceOptions extends ConfirmOptions {
  secondaryText?: string;
}

export type ConfirmChoiceResult = "confirm" | "cancel" | "secondary";

interface ConfirmContextType {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  confirmChoice: (opts: ConfirmChoiceOptions) => Promise<ConfirmChoiceResult>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmChoiceOptions>({
    title: "",
    message: "",
  });
  const resolverRef = useRef<((result: ConfirmChoiceResult) => void) | null>(null);

  const resolveConfirm = (result: ConfirmChoiceResult) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setVisible(false);
    resolver?.(result);
  };

  const confirmChoice = (opts: ConfirmChoiceOptions): Promise<ConfirmChoiceResult> => {
    return new Promise((resolve) => {
      if (resolverRef.current) {
        resolverRef.current("cancel");
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

  const confirm = async (opts: ConfirmOptions): Promise<boolean> => {
    const result = await confirmChoice(opts);
    return result === "confirm";
  };

  const handleCancel = () => resolveConfirm("cancel");
  const handleConfirm = () => resolveConfirm("confirm");
  const handleSecondary = () => resolveConfirm("secondary");

  return (
    <ConfirmContext.Provider value={{ confirm, confirmChoice }}>
      {children}
      <ConfirmModal
        visible={visible}
        type={options.type}
        iconName={options.iconName}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        secondaryText={options.secondaryText}
        showCancel={options.showCancel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onSecondary={handleSecondary}
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
  const confirmChoice =
    context?.confirmChoice ||
    (async () => "cancel" as ConfirmChoiceResult);

  // Return empty component for backwards compatibility with screens that still render it
  return {
    confirm,
    confirmChoice,
    ConfirmModal: () => null,
  };
};
