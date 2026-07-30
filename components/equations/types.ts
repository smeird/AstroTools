import type { ReactNode } from "react";

export interface EquationVariableDefinition {
  readonly symbol: ReactNode;
  readonly meaning: ReactNode;
  readonly unit: ReactNode;
}

export interface EquationCardProps {
  readonly title: string;
  readonly inWords: ReactNode;
  readonly variables: readonly EquationVariableDefinition[];
  readonly finalResult: ReactNode;
  readonly interpretation: ReactNode;
  readonly children: ReactNode;
}

export interface MathExpressionProps {
  readonly label: string;
  readonly children: ReactNode;
}
