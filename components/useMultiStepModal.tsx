import React, { useState } from "react";
import { MultiStepModal } from "@/components/workflow/MultiStepModal";

export const useMultiStepWorkflowModal = () => {
  const [visible, setVisible] = useState(false);
  const open = () => setVisible(true);
  const close = () => setVisible(false);
  const modal = <MultiStepModal visible={visible} onClose={close} />;
  return { open, close, modal };
};
