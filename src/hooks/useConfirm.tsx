/**
 * useConfirm - Hook for showing confirmation modals
 * Reusable across the app for any confirmation action
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ConfirmModal,
  ConfirmModalIconName,
  ConfirmModalType,
} from "../components/ui/ConfirmModal";

interface ConfirmOptions {
  type?: ConfirmModalType;
  iconName?: ConfirmModalIconName;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const useConfirm = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    message: "",
  });
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
    };
  }, []);

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
          opts.cancelText ?? t("common.cancel", { defaultValue: "Cancel" }),
      });
      setVisible(true);
    });
  };

  const handleCancel = () => {
    resolveConfirm(false);
  };

  const handleConfirm = () => {
    resolveConfirm(true);
  };

  const ConfirmModalComponent = () => (
      <ConfirmModal
        visible={visible}
        type={options.type}
        iconName={options.iconName}
        title={options.title}
        message={options.message}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return {
    confirm,
    ConfirmModal: ConfirmModalComponent,
  };
};
