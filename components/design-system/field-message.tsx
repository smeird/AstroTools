export function fieldDescriptionIds(
  description: string | undefined,
  error: string | undefined,
  descriptionId: string,
  errorId: string,
): string | undefined {
  const ids = [
    description ? descriptionId : null,
    error ? errorId : null,
  ].filter(Boolean);

  return ids.length > 0 ? ids.join(" ") : undefined;
}
