import type { LabelStyleTokens } from "../../types/labelLayer";

export const DEFAULT_LABEL_STYLE: Required<
  Pick<
    LabelStyleTokens,
    | "textColor"
    | "textHaloColor"
    | "textHaloWidth"
    | "textSize"
    | "textFont"
    | "textAnchor"
    | "textOffset"
    | "highlightTextColor"
    | "highlightTextHaloColor"
    | "highlightTextSize"
  >
> = {
  textColor: "#1a1a1a",
  textHaloColor: "#ffffff",
  textHaloWidth: 1.5,
  textSize: 14,
  textFont: ["Noto Sans Regular"],
  textAnchor: "center",
  textOffset: [0, 0.5],
  highlightTextColor: "#b45309",
  highlightTextHaloColor: "#fef3c7",
  highlightTextSize: 16
};

export function mergeLabelStyle(
  style: LabelStyleTokens | undefined
): Required<
  Pick<
    LabelStyleTokens,
    | "textColor"
    | "textHaloColor"
    | "textHaloWidth"
    | "textSize"
    | "textFont"
    | "textAnchor"
    | "textOffset"
    | "highlightTextColor"
    | "highlightTextHaloColor"
    | "highlightTextSize"
  >
> {
  return {
    ...DEFAULT_LABEL_STYLE,
    ...style
  };
}
