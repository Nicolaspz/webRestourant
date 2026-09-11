export type PosSettings = {
  paperWidth: '58' | '80' | 'a4';
  printerName: string;
  copies: number;
  autoPrint: boolean;
  showPrintDialog: boolean;
  cutPaper: boolean;
  printLogo: boolean;
};

export const DEFAULT_POS_SETTINGS: PosSettings = {
  paperWidth: '80', printerName: '', copies: 1, autoPrint: true,
  showPrintDialog: true, cutPaper: true, printLogo: true,
};

export const normalizePosSettings = (value?: Partial<PosSettings> | null): PosSettings => ({
  ...DEFAULT_POS_SETTINGS,
  ...(value || {}),
  copies: Math.max(1, Math.min(3, Number(value?.copies) || 1)),
});
