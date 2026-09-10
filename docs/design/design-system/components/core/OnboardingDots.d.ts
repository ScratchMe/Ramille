/** Quatre points de 8 px — la progression de l’onboarding. */
export interface OnboardingDotsProps {
  total: number;
  activeIndex: number;
  /** Sur fond teinté (onboarding 3), les points inactifs passent en paginationInactive. */
  onTint?: boolean;
}
export declare function OnboardingDots(props: OnboardingDotsProps): JSX.Element;
